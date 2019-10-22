/**
 * Servidor de Chat utilizando a biblioteca 
 * socket.io (https://socket.io)
 * com NodeJS.
 * 
 * A biblioteca express (https://expressjs.com)
 * é utilizada para facilitar a criação de aplicações
 * web com nodejs, uma vez que ela permite escrever métodos separados
 * para atender à solicitações de acesso à diferentes páginas
 * de uma aplicação web.
 * 
 * Observe que o código usa funções anônimas extensivamente 
 * (um recurso do JavaScript e de muitas linguagens),
 * quando temos uma função que não tem um nome.
 * Por exemplo: function(requisicao, resposta){ ... }
 * Observe que não há um nome depois da palavra function.
 * Se você não sabe o que são funções anônimas,
 * veja a documentação do Firefox em https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide/Funções.
 */

/*
Importa a biblioteca express e automaticamente cria o objeto express (da classe Application) que
vai permitir programarmos nosso servidor para responder à solicitações
de acesso às páginas HTML (neste exemplo caso apenas à index.html)
da nossa aplicação web.
https://expressjs.com/en/4x/api.html
*/
const app = require('express')();

/*
Cria um servidor HTTP que vai ficar escutando numa porta a ser
definida logo abaixo.
Esta biblioteca não precisa ser adicionada como dependência no package.json,
pois ela é fornecida por padrão com o nodejs.
Server é uma das várias classes definidas no módulo HTTP,
que precisamos explicitamente instanciar.
https://nodejs.org/api/http.html
 */
const http = require('http').Server(app);

/*
Importa a biblioteca socket.io e automaticamente cria um objeto da classe
Server que representará nosso servidor de WebSocket.
Como o WebSocket trafega dados sobre o protocolo HTTP,
nosso servidor http então é indicado abaixo como sendo o canal
a ser utilizado para trafegar os dados do WebSocket.
 */
const serverSocket = require('socket.io')(http);

/*Porta na qual o servidor vai ficar aguardando requisições HTTP.
Usar a porta 80 pode exigir permissões de root no Linux.
Se a aplicação estiver rodando em um servidor de nuvem gratuito como o heroku.com,
não podemos escolher a porta.
Esta é escolhida por nós e armazenada em uma variável de ambiente.
Assim, verificamos se tal variável existe e obtemos seu valor para
definir a porta. Se não exibir, é porque estamos executando
a aplicação localmente ou em um servidor que não 
define a porta a ser usada (ou que define de outra maneira).
No caso do nome do host é o mesmo processo.*/
const porta = process.env.PORT || 8000

/**HOST é uma variável de ambiente definida manualmente 
 * nas configurações da aplicação no heroku,
 * indicando o domínio que o heroku disponibiliza
 * para a aplicação.
 * Se a variável não existir (pois estamos rodando a app localmente
 * ou em outro provedor), vai usar localhost como host.
 */
const host = process.env.HOST || "http://localhost"

/*
 * Faz o servidor ficar escutando a porta indicada acima, aguardando requisições.
 * Quando a função é iniciada, a aplicação começa a escutar tal porta.
 * O primeiro parâmetro é o número da porta que a aplicação vai ficar escutando (aguardando requisições)
 * O segundo parâmetro é uma função anônima sem parâmetros que será chamada automaticamente
 * quando o servidor começar a escutar na porta indicada.
 * Neste caso, exibiremos apenas uma mensagem no terminal do servidor.
 * O método listen espera que tal função anônima não tenha parâmetros,
 * como indicado em https://nodejs.org/api/net.html#net_server_listen_options_callback
 */
http.listen(porta, function(){
    //Se a porta for 80, não precisa exibir na URL pois é padrão
    const portaStr = porta === 80 ? '' :  ':' + porta;
    /*HEROKU é uma variável de ambiente definida manualmente 
    nas configurações da aplicação quando hospedada no Heroku.
    Com isto, a app pode saber se está rodando no heroku ou não.
    O heroku não nos permite escolher a porta em que o servidor
    nodejs vai escutar. Ele escolhe uma porta aleatoriamente
    e armazena na variável de ambiente process.env.PORT.
    Apesar de ele usar uma porta diferente da 80,
    acessamos a aplicação pela porta 80,
    como em https://chatwss.herokuapp.com.
    O heroku hospeda aplicações de diferentes clientes (desenvolvedores)
    em um mesmo servidor. No caso do nodejs, cada aplicação possui seu próprio
    servidor embutido. É diferente de aplicações como em PHP ou python onde 
    tem-se um servidor como Apache ou nginx onde instalamos diferentes aplicações
    nele.
    No nodejs, se cada app executa no seu próprio servidor,
    não temos como ter mais de uma app usando a porta 80 na mesma máquina.
    Assim, o que possivelmente o heroku faz é ter um balanceador de carga
    que recebe requisições na porta 80 e então, de acordo com o subdominio
    acessado (como chatwss em herokuapp.com), tal balanceador vai direcionar
    a requisição para a aplicação que responde por aquele domínio, 
    na porta escolhida pelo heroku.
    Assim, apesar de ele escolher uma porta aleatória, tal porta é usada
    apenas internamente dentro da rede do heroku.
    Externamente, os usuários acessam a app pela porta 80,
    logo, não temos problemas com firewalls.
    Desta forma, abaixo verificamos se a app tá rodando no heroku
    e assim, não exibimos a porta que está sendo internamente usada,
    pois para os usuários da app, a porta será 80.
     */
    if (process.env.HEROKU)
        console.log('Servidor iniciado. Abra o navegador em ' + host);
    else console.log('Servidor iniciado. Abra o navegador em ' + host + portaStr);
});

/*
 * A chamada express.get indica que queremos que uma função seja chamada
 * sempre que ocorrerem requisições à página inicial do servidor (raíz do site),
 * normalmente http://localhost:porta/
 * A porta é definida acima.
 * 
 * Quando uma requisição à raíz for solicitada,
 * é retornado o conteúdo do arquivo index.html para o cliente.
 * Assim, ele poderá ver a interface para interagir no chat.
 * 
 * O primeiro parâmetro na chamada express.get abaixo indica que neste código,
 * estamos processando requisições à raíz do site (/).
 * O segundo parâmetro é uma função anônima que será chamada automaticamente
 * quando uma requisição à tal endereço for recebida.
 * Tal função precisa ter 2 parâmetros: requisicao e resposta (não necessariamente com estes nomes).
 * Quando ela for chamada, estes dois parâmetros serão passados à ela automaticamente.
 * Tais parâmetros são descritos abaixo:
 * - requisicao dados da requisição HTTP enviada pelo usuário,
 *              como URL solicitada e IP do cliente
 * - resposta   objeto por meio do qual conseguimos enviar uma resposta
 *              ao cliente, por exemplo,
 *              com o conteúdo da página HTML a ser exibido no navegador.
 * A biblioteca express é que define que tal função deve ter obrigariamente
 * estes dois parâmetros, que são extremamente úteis para permitir verificar
 * qualquer informação a respeito da requisição do usuário e poder enviar
 * uma resposta pra ele.
 * 
 * Veja detelhes em https://expressjs.com/en/4x/api.html#app.get.method
 */
app.get('/', function (requisicao, resposta) {
    resposta.sendFile(__dirname + '/index.html');
});

/*
 * A chamada serverSocket.on('connect') indica que queremos que uma determinada função seja executada 
 * sempre que um cliente conectar ao servidor.
 * Isto ocorre quando o cliente abre a página
 * http://localhost:porta/
 * 
 * Cada aba que o cliente abrir no navegador para tal endereço
 * vai representar um novo usuário conectado ao servidor.
 * Assim, a cada aba ou janela aberta em tal endereço,
 * esta função é chamada para iniciar a conexão do cliente com o servidor.
 * 
 * O primeiro parâmetro da função on indica qual tipo de evento 
 * desejamos monitorar. Assim, estamos dizendo que queremos
 * monitorar eventos de conexão (connect).
 * 
 * Quando um evento deste ocorrer, a função anônima passada
 * no segundo parâmetro do método on será chamada automaticamente,
 * nos permitindo processar a conexão de um cliente.
 * Tal função deve ter um parâmetro socket, 
 * que representa o WebSocket pelo qual o servidor
 * pode se comunicar com o cliente.
 */
serverSocket.on('connect', function(socket){
    console.log('\nCliente conectado: ' + socket.id);

    /*
    A chamada socket.on('disconnect') abaixo indica que queremos que uma função anônima seja chamada quando o cliente
    do socket acima desconectar do servidor 
    (fechando a aba ou janela do navegador ou perdendo a conexão).
    Neste caso, uma função anônima será chamada e apenas exibirá uma mensagem no terminal.
    */
    socket.on('disconnect', function(){
        console.log('Cliente desconectado: ' + socket.id);
    });
        
    /*
    A chamada socket.on('chat msg') abaixo indica que queremos que uma função anônima seja chamada quando
    uma mensagem do tipo "chat msg" for enviada pelo cliente do socket acima.
    Tal mensagem representa um conversa do cliente.
    O tipo "chat msg" foi definido por nós. 
    A biblioteca socket.io nos permite definir qualquer
    tipo de mensagem que desejarmos.
    O tipo da mensagem permite criar funções específicas no servidor
    que tratam somente aquele tipo de mensagem.
    Assim, o código fica bem organizado.
    Não precisamos incluir if's para verificar qual o tipo
    da mensagem recebida, uma vez que a função abaixo
    vai ser chamada somente quando mensagens do tipo especificado
    forem enviadas.

    A função anônima passada receberá a mensagem (msg) enviada ao servidor.
    */
    socket.on('chat msg', function(msg){
        console.log('Mensagem: ' + msg);
        /*Usando serverSocket.emit(), encaminhamos a mensagem recebida para todos os clientes conectados,
        incluindo o que enviou a mensagem. 
        Assim, a mensagem aparecerá na lista do emissor também.
        */
        serverSocket.emit('chat msg', msg);
    });

    /*
    A chamada socket.on('status') abaixo indica que queremos que uma função anônima seja chamada quando 
    o cliente do socket acima enviar uma mensagem de status
    para o servidor. Tal mensagem pode indicar, por exemplo, que
    o usuário está digitando.
    Quando uma mensagem deste tipo é recebida, é feito broadcast
    dela, ou seja, ela é enviada para todos os outros usuários.
    Assim, eles saberão o status de um determinado usuário.

    A função anônima passada receberá a mensagem (msg) enviada ao servidor.
     */
    socket.on('status', function(msg){
        console.log(msg);
        /*A chamada socket.broadcast.emit() reencaminha a mensagem de status recebida
         para todos os clientes conectados, exceto o emissor da mensagem.*/
        socket.broadcast.emit('status', msg);
    })
});

