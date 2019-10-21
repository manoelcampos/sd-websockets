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
 * Objeto contendo os sockets dos servidores disponíves, que permite ao balanceador de carga enviar mensagem a eles.
 * Para cada servidor disponível, este objeto conterá um atributo cujo nome será o endereço do servidor.
 * Se tivermos 2 servidores rodando nos endereços localhost:8001 e localhost:8002,
 * então teremos dois atributos cujos nomes são estes endereços e o valor de cada um
 * é o socket do servidor respectivo.
 * 
 * É utilizado um objeto no lugar de um vetor pois assim, quando precisarmos
 * de informações sobre um servidor específico, não temos que percorrer o vetor
 * para localizar tal servidor.
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
    /*
    Obtém a lista de atributos (campos) do objeto serverSockets,
    onde o nome de cada atributo representa o endereço de um servidor.
    Assim, o total de atributos representa o total de servidores disponíveis.
    Como serverSockets não é um vetor, para saber o total de servidores disponíveis
    temos que verificar o total de atributos (fields) do objeto.
    */
    const fields = Object.keys(serverSockets);

    if (fields.length == 0){
        response.status(503).send("<b>Não há nenhum servidor disponível ainda. Por favor tenta mais tarde!</b>");
        return;
    }

    for(let i = 0; i < fields.length; i++){
        //Seleciona o próximo servidor da lista (de forma rotativa, se chegar ao final da lista, volta pro início)
        serverIndex = (serverIndex+1) % fields.length;

        //Obtém o nome de um atributo, que representa o endereço de um servidor
        let serverAddress = fields[serverIndex];
        //Obtém o valor de tal atributo, que representa o socket do servidor
        const serverSocket = serverSockets[serverAddress];
        serverAddress = 'http://' + serverAddress;
        console.log(`Servers: ${fields.length} Selected server: ${serverIndex} serverAddress: ${serverAddress}`);

        if (util.hostAvailable(serverAddress)) {
            console.log(`Redirecionando usuário para servidor ${serverIndex} em ${serverAddress}`)
            response.status(307).redirect(serverAddress);
            return;
        } else {
            /* 
            Se não foi possível se comunicar com o servidor,
            incrementa o número de tentativas e, caso esta tenha excedido
            o máximo permitido, define o servidor como off-line. 
            */
            if (++serverSocket.connectionTries > maxServerTries){
                //Apaga o servidor da lista de servidores disponíveis.
                delete serverSockets[serverAddress];
                console.log(`Servidor ${serverAddress} off-line`);
            }
            else console.log(`Servidor ${serverAddress} não respondeu. Será tentado conectar nele em uma próxima requisição`);
        }
    }

    response.status(503).send("<b>Não há nenhum servidor disponível. Por favor tente novamente mais tarde.</b>");
});

/** Monitora quando um servidor conectar no balanceador de carga via WebSocket */
balancerSocket.on('connect', function (socket) {
    /*
    Quando um servidor conecta ao balanceador de carga, ele informa seu endereço 
    para que este seja armazenado e permita ao balanceador direcionar as requisições HTTP
    dos clientes para o endereço de um dos servidores disponíveis.
    */
    socket.on('serverAddress', function (serverAddress) {
        /*Adiciona um novo atributo ao objeto serverSockets cujo nome do atributo
        é o endereço do servidor (como localhost:8001) e o valor do atributo é o socket do 
        servidor conectado ao balanceador.*/
        serverSockets[serverAddress] = socket;

        /*Também armazena o endereço do servidor no próprio socket dele para facilitar o acesso,
        como nos eventos 'disconnect' e 'chat msg' abaixo*/
        socket.serverAddress = serverAddress;

        /*
        Número de tentativas de conexão do balanceador com o servidor.
        Como o servidor acabou de conectar ao balanceador, este último ainda não terá tentado 
        redirecionar usuários para tal servidor. Por isso o valor inicial é zero. 
        */
        serverSockets[serverAddress].connectionTries = 0;
        console.log(`Servidor ${serverAddress} conectado ao balanceador de carga`);
    });

    // Quando um servidor desconectar do balanceador de carga, remove ele da lista de servidores disponíveis.
    socket.on('disconnect', function () {
        console.log(`Servidor ${socket.serverAddress} ficou off-line`);
        delete serverSockets[socket.serverAddress];
    });

    /*
    Quando um servidor enviar uma mensagem ao balanceador,
    é porque esta é uma mensagem privada que deve ser encaminhada ao servidor 
    responsável pelo usuário de destino.
    */
    socket.on('chat msg', function (msg) {
        const sourceServer = socket.serverAddress;
        const destinationServer = util.getDestinationServer(msg);
        console.log(`Msg privada recebida do servidor ${sourceServer} para encaminhamento para ${destinationServer}: ${msg}`);

        if(sendMsgToServer(destinationServer, msg))
            console.log(`Mensagem privada encaminhada ao servidor ${sourceServer}: ${msg}`);
        else console.log(`Servidor de destino ${destinationServer} não localizado para encaminhamento da mensagem`);
    });
});

/**
 * Tenta enviar encaminhar a um servidor para entrega a um usuário específico.
 * @param {String} destinationServer endereço do servidor de destino
 * @param {String} msg mensagem a ser encaminhada
 * @return true se o servidor foi encontrado, false caso contrário
 */
function sendMsgToServer(destinationServer, msg){
    const serverSocket = serverSockets[destinationServer];
    //Se encontrou o servidor de destino, encaminha a mensagem a ele.
    if (serverSocket != undefined){
        serverSockets[destinationServer].emit('chat msg', msg)
        return true;
    }

    return false;
}