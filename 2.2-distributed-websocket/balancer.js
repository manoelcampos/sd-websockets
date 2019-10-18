const util = require('./util.js');

const express = require('express')();
const http = require('http').Server(express);
const host = 'localhost';
const port = util.loadBalancerPort;

/** 
 * Socket do balanceador de carga, que permite aos servidores se conectarem. 
 * Assim, o balanceador faz a intermediação da comunicação entre servidores. 
 * Quando um usuário de um servidor envia mensagem para outro em outro
 * servidor, a mensagem é enviada para o balanceador que entrega para o servidor de destino. 
 * E este, por sua vez, entrega ao usuário especificado. 
 */
const balancerSocket = require('socket.io')(http);

/** 
 * Endereços dos servidores disponíveis para balancear a carga,
 * carregados a a partir do arquivo servers.json (definido em util.js)
 */
let servers = [];

/**
 * Objeto contendo os sockets dos servidores disponíves, que permite ao balanceador de carga enviar mensagem a eles.
 * Este objeto contém um atributo cujo nome será o ID do socket do servidor,
 * para cada servidor disponível.
 * Se tivermos 2 sockets com os IDs S9834ASDFLJ e LS0291LAS,
 * então teremos dois atributos cujos nomes são estes IDs e o valor de cada um
 * é o socket do servidor respectivo.
*/
const serverSockets = {};

/** Número do servidor que foi direcionada a última requisição de um cliente */
let serverIndex = -1;

/** Número máximo de vezes para tentar acessar um determinado servidor */
const maxServerTries = 4;

http.listen(port, function(){
    console.log(`Iniciando balanceador de carga. Abra o navegador em http://${host}:${port}\n`);
});

express.get('/', function (request, response) {
    servers = util.loadServersFile();
    if(servers.length == 0){
        response.status(503).send("<b>Não há nenhum servidor disponível. Por favor tenta mais tarde</b>");
        return;
    }

    /*
    Obtém a lista de atributos (campos) do objeto servers,
    onde o nome de cada atributo representa o endereço de um servidor.
    Assim, o total de atributos representa o total de servidores disponíveis.
    */
    const fields = Object.keys(servers);
    for(let i = 0; i < fields.length; i++){
        //Seleciona o próxima servidor da lista (de forma rotativa, se chegar ao final da lista, volta pro início)
        serverIndex = (serverIndex+1) % fields.length;

        //Obtém o nome de um atributo, que representa o endereço de um servidor
        const server = fields[serverIndex];

        if (util.hostAvailable(server)) {
            console.log(`Redirecionando usuário para servidor ${serverIndex} em ${server}`)
            response.status(307).redirect(server);
            return;
        } else {
            /* 
            Se não foi possível se comunicar com o servidor,
            incrementa o número de tentativas e, caso esta tenha excedido
            o máximo permitido, define o servidor como off-line. 
            */
            if (++servers[server] > maxServerTries){
                //Apaga o servidor da lista de servidores disponíveis.
                delete servers[server];
                console.log(`Servidor ${server} off-line`);
            }
            else console.log(`Servidor ${server} não respondeu. Será tentado conectar nele em uma próxima requisição`);
            util.saveServersFile(servers);
        }
    }

    response.status(503).send("<b>Não há nenhum servidor disponível. Por favor tente novamente mais tarde.</b>");
});

/** Monitora quando um servidor conectar no balanceador de carga via WebSocket */
balancerSocket.on('connect', function (socket) {
    /* 
    Quando um servidor conecta ao balanceador de carga via WebSockets,
    adiciona um novo atributo ao objeto serverSockets, cujo nome de tal atributo é o ID
    do socket e o valor é o próprio socket de tal servidor.
    Neste caso, o servidor da aplicação é um cliente do balanceador de carga. 
    */
    serverSockets[socket.id] = socket;

    /*
    Quando um servidor conecta ao balanceador de carga, ele informa seu endereço 
    para que este seja armazenado e permita ao balanceador direcionar as requisições HTTP
    dos clientes para o endereço de um dos servidores disponíveis.
    */
    socket.on('server', function (server) {
        serverSockets[socket.id].server = server;
        console.log(`Servidor ${server} conectado ao balanceador de carga`);
    });

    // Quando um servidor desconectar do balanceador de carga, remove ele da lista de servidores disponíveis.
    socket.on('disconnect', function () {
        console.log(`Servidor ${serverSockets[socket.id].server} ficou off-line`);
        delete serverSockets[socket.id];
    });

    /*
    Quando um servidor enviar uma mensagem ao balanceador,
    é porque esta é uma mensagem privada que deve ser encaminhada ao servidor 
    responsável pelo usuário de destino.
    */
    socket.on('chat msg', function (msg) {
        const sourceServer = serverSockets[socket.id].server;
        const destinationServer = util.getDestinationServer(msg);
        console.log(`Msg privada recebida do servidor ${sourceServer} para encaminhamento para ${destinationServer}: ${msg}`);
        if(sendMsgToServer(destinationServer, msg))
            console.log(`Mensagem privada encaminhada ao servidor ${sourceServer}: ${msg}`);
        else console.log(`Servidor de destino ${destinationServer} não localizado para encaminhamento da mensagem`);
    });
});

/**
 * Percorre a lista de servidores conectados ao balanceador de carga
 * e verifica a qual deles uma mensagem privada está direcionada.
 * Ao encontrar o servidor de destino, encaminha a mensagem a ele.
 * @param {String} destinationServer endereço do servidor de destino
 * @param {String} msg mensagem a ser encaminhada
 * @return true se o servidor foi encontrado, false caso contrário
 */
function sendMsgToServer(destinationServer, msg){
    //Percorre os atributos do objeto serverSockets, que representam os ID do socket de cada servidor conectado.
    for (socketId in serverSockets){
        //Se encontrou o servidor de destino, encaminha a mensagem a ele.
        if(serverSockets[socketId].server === destinationServer){
            serverSockets[socketId].emit('chat msg', msg)
            return true;
        }
    }

    return false;
}