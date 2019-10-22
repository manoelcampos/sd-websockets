console.log('Você pode iniciar quantos servidores desejar. Formas de iniciar um servidor:')
console.log('\tIniciar um servidor em uma porta aleatória: npm start')
console.log('\tIniciar um servidor em uma porta específica: npm start ip_ou_domínio porta\n')

const util = require('./util.js');
const app = require('express')();
const http = require('http').Server(app);

/**
 * Socket da aplicação servidora, no qual os usuários conectam.
 */
const serverSocket = require('socket.io')(http);

/**
 * Verifica se foram passadas o endereço e porta para iniciar o servidor por parâmetro de linha de comando
 */
const hasParameters = process.argv.length == 4;

const host  = hasParameters ? process.argv[2] : "localhost";
const port = hasParameters ? process.argv[3] : util.randomPort();
const server = `${host}:${port}`;

/**
 * Conecta no WebSocket do balanceador de carga para permitir que ele intermedie a comunicação
 * entre servidores quando um usuário enviar uma mensagem para outro em um servidor diferente.
 */
const loadBalancerSocket = require('socket.io-client')(util.loadBalancerAddress);

/** 
 * Informa ao balanceador o endereço deste servidor para que o balanceador 
 * possa se comunicar com ele via WebSockets e encaminhar mensagens.
 */
loadBalancerSocket.emit('serverAddress', server);

/**
 * Objeto contendo os sockets dos usuários conectados neste servidor, que permite 
 * ao servidor entregar mensagens privadas.
 * Este objeto contém um atributo cujo nome será o ID do socket do usuário,
 * para cada usuário conectado.
 * 
 * Se tivermos 2 sockets com os IDs S9834ASDFLJ e LS0291LAS,
 * então teremos dois atributos cujos nomes são estes IDs e o valor de cada um
 * é o socket do usuário respectivo.
*/
const users = {};

loadBalancerSocket.on('chat msg', function(msg){
    const destinationLogin = util.getDestinationLogin(msg);
    console.log(`Msg privada recebida do balanceador para encaminhamento para ${destinationLogin}: ${msg}`);
    if (sendMsgToUser(destinationLogin, msg))
        console.log(`Msg privada enviada para usuário ${destinationLogin}: ${msg}`);
    else console.log(`Usuário de destino ${destinationLogin} não encontrado`);
});

/**
 * Encontra usuário de destino para entregar uma mensagem privada.
 * 
 * @param {String} destinationUser login do usuário de destino
 * @param {String} msg mensagem a ser enviada
 */
function sendMsgToUser(destinationUser, msg){
    for (const id in users) {
        if (destinationUser == users[id].login) {
            users[id].emit('chat msg', msg);
            return true;
        }
    }

    return false;
}

http.listen(port, function(){
    console.log(`Servidor iniciado. Abra a aplicação pelo endereço do balanceador de carga em ${util.loadBalancerAddress}`);
});

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

serverSocket.on('connect', function(socket){
    console.log(`\nServidor ${server} -> Usuário conectado:   ${socket.id}`);

    /* 
    Para cada usuário que conecta, adiciona um novo atributo
    no objeto users, cujo nome será o id do socket e o valor
    o próprio socket do usuário. 
    Tal objeto é utilizado para encontrar um usuário pelo login
    quando alguém desejar enviar uma mensagem privada a ele.
    */
    users[socket.id] = socket;

    socket.on('disconnect', function(){
        console.log(`Servidor ${server} -> Usuário desconectou: ${socket.id}`);
        /*
        Quando o usuário desconecta, remove o atributo que representa
        o socket do usuário do objeto users. Assim, se alguém tentar mandar
        mensagem para tal usuário, o sistema pode informar que o usuário não foi localizado
        */
        delete users[socket.id];
    });
        
    /* 
    Quando um usuário conecta pela interface web, ele envia uma mensagem do tipo "login"
    com seu nickname (seu nome de login) para o servidor.
    Tal dado é guardado como um atributo "login" dentro do próprio socket do usuário. 
    */
    socket.on('login', function (nickname) {
        socket.login = nickname + '@' + server
        const msg = `Usuário logado:      ${socket.login}`;
        console.log(`Servidor ${server} -> ${msg}`);
        serverSocket.emit('login', socket.login);
    });

    socket.on('chat msg', function(msg){
        console.log(`Servidor ${server} -> Mensagem do usuário  ${socket.id}: ${msg}`);
        if (util.isPrivateMsg(msg)){
            loadBalancerSocket.emit('chat msg', msg);
            console.log(`Enviando mensagem privada pro balanceador de carga encaminhar: ${msg}`);
        }
        //Envia mensagem pra todos os usuários conectados no servidor, exceto o emissor
        else socket.broadcast.emit('chat msg', msg);
    });

    socket.on('status', function(msg){
        socket.broadcast.emit('status', msg);
    });
});

