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
 * Vetor contendo os sockets dos servidores atualmente disponíveis.
*/
const servers = [];

/** Número do servidor que foi direcionada a última requisição de um cliente */
let serverIndex = -1;

/** Número máximo de vezes para tentar acessar um determinado servidor */
const maxServerTries = 4;

http.listen(port, function(){
    console.log(`Iniciando balanceador de carga. Abra o navegador em http://${host}:${port}\n`);
});

express.get('/', function (request, response) {
    if (servers.length == 0){
        response.status(503).send("<b>Não há nenhum servidor disponível ainda. Por favor tenta mais tarde!</b>");
        return;
    }

    /* Tenta encontrar um servidor do total de sevidores na lista.
    A quantidade máxima de vezes que o loop vai executar é igual
    ao total de servidores no vetor.
    Se o loop encontrar um sevidor disponível na primeira iteração, ele já para.
    Se não, ele continua procurando, até o máximo de iterações permitidas. */
    for(let i = 0; i < servers.length; i++){
        //Seleciona o próximo servidor da lista (de forma rotativa, se chegar ao final da lista, volta pro início)
        serverIndex = (serverIndex+1) % servers.length;

        /*Obtém o socket que permite o balanceador de carga se comunicar com um servidor, 
        e possui o endereço do mesmo*/
        const socket = servers[serverIndex];

        console.log(`Servidores disponíveis: ${servers.length}`);
        console.log(`Servidor selecionado: ${serverIndex} endereço: ${socket.serverAddress}`);

        if (util.isHostAvailable(socket.serverAddress)) {
            console.log(`Redirecionando usuário para servidor ${serverIndex} em ${socket.serverAddress}`)
            response.status(307).redirect(socket.serverAddress);
            return;
        } else {
            /* 
            Se não foi possível se comunicar com o servidor,
            incrementa o número de tentativas e, caso esta tenha excedido
            o máximo permitido, define o servidor como off-line. 
            */
            if (++socket.connectionTries > maxServerTries){
                //Apaga o servidor do vetor de servidores disponíveis.
                delete servers[serverAddress];
                console.log(`Servidor ${socket.serverAddress} off-line`);
            }
            else console.log(`Servidor ${socket.serverAddress} não respondeu. Será tentado conectar nele em uma próxima requisição`);
        }
    }

    response.status(503).send("<b>Não há nenhum servidor disponível. Por favor tente novamente mais tarde.</b>");
});

/** Monitora quando um servidor conectar ao balanceador de carga via WebSocket.
 * socket representa a conexão WebSocket de um servidor da aplicação
 * com o balanceador de carga.
 */
balancerSocket.on('connect', function (socket) {
    /*
    Quando um servidor conecta ao balanceador de carga, ele informa seu endereço 
    para que este seja armazenado e permita ao balanceador direcionar as requisições HTTP
    dos clientes para o endereço de um dos servidores disponíveis.
    */
    socket.on('serverAddress', function (serverAddress) {
        /*Adiciona o novo servidor ao vetor de servidores.
        Assim, o balanceador pode direcionar clientes para algum desses servidores.*/
        servers.push(socket);

        /*Também armazena o endereço do servidor no próprio socket dele para facilitar o acesso,
        como nos eventos 'disconnect' abaixo*/
        socket.serverAddress = serverAddress;

        /*
        Número de tentativas de conexão do balanceador com o servidor.
        Como o servidor acabou de conectar ao balanceador, este último ainda não terá tentado 
        redirecionar usuários para tal servidor. Por isso o valor inicial é zero. 
        */
        socket.connectionTries = 0;
        console.log(`Servidor ${serverAddress} conectado ao balanceador de carga`);
    });

    // Quando um servidor desconectar do balanceador de carga, remove ele da lista de servidores disponíveis.
    socket.on('disconnect', function () {
        console.log(`Servidor ${socket.serverAddress} ficou off-line`);
        delete servers[socket.serverAddress];
    });
});
