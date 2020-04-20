console.log('Você pode iniciar quantos servidores desejar. Formas de iniciar um servidor:')
console.log('\tIniciar um servidor em uma porta aleatória: npm start')
console.log('\tIniciar um servidor em uma porta específica: npm start ip_ou_domínio porta\n')

const util = require('./util.js');
const express = require('express');

const app = express();
app.use(express.static("public"));

const http = require('http').Server(app);

/**
 * Socket da aplicação servidora, no qual os usuários conectam.
 */
const serverSocket = require('socket.io')(http);

/**
 * Verifica se foram passados o endereço e porta para iniciar o servidor por parâmetro de linha de comando
 */
const hasParameters = process.argv.length == 4;

const host  = hasParameters ? process.argv[2] : "localhost";
const port = hasParameters ? process.argv[3] : util.randomPort();
const serverAddress = `http://${host}:${port}`;

/**
 * Conecta no WebSocket do balanceador de carga para que este
 * saiba quais são os servidores disponíveis.
 */
const loadBalancerSocket = require('socket.io-client')(util.loadBalancerAddress);

/** 
 * Informa ao balanceador o endereço deste servidor para que o balanceador 
 * possa direcionar clientes para um dos servidores disponíveis.
 */
loadBalancerSocket.emit('serverAddress', serverAddress);

http.listen(port, function(){
    console.log(`Servidor iniciado. Abra a aplicação pelo endereço do balanceador de carga em ${util.loadBalancerAddress}`);
});

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

serverSocket.on('connect', function(socket){
    socket.on('disconnect', function(){
        console.log(`Servidor ${serverAddress} -> Usuário desconectou: ${socket.login}`);
    });
        
    socket.on('login', function (nickname) {
        socket.login = nickname 
        const msg = `Usuário logado:      ${socket.login}`;
        console.log(`Servidor ${serverAddress} -> ${msg}`);
    });

    socket.on('chat msg', function (msg) {
        msg = `${socket.login}: ${msg}`
        console.log(`Servidor ${serverAddress} -> Mensagem do usuário ${msg}`);
        socket.broadcast.emit('chat msg', msg);
    });

    socket.on('status', function(msg){
        socket.broadcast.emit('status', msg);
    });
});

