/**
 * Classe com métodos utilitários utilizados tanto pelo balanceador de carga como pelos servidores. 
 */
class Util{
    
    /**
     * Carrega os dados do arquivo de servidores e retorna
     * um objeto com tais dados.
     * Tal objeto conterá um atributo para cada servidor existente,
     * onde o nome do atributo é o endereço do servidor e o valor do atributo
     * é inicialmente o número de vezes que se tentou conectar no servidor sem sucesso.
     * Este valor é utilizado para que, depois de uma determinada quantidade de tentativas,
     * o servidor seja considerado off-line.
     * São feitas várias tentativas pois o servidor poderia estar apenas
     * ocupado e não conseguiu responder a tempo.
     */
    static loadServersFile(){
        /*
        Se o arquivo de servidores não existe, 
        cria um com um objeto vazio dentro dele e retorna tal objeto vazio.
        */
        if (!Util.fs.existsSync(Util.serversFile)) {
            Util.fs.writeFileSync(Util.serversFile, "{}");
            return {};
        }

        return JSON.parse(Util.fs.readFileSync(Util.serversFile));
    }

    /**
     * Sava o objeto contendo os endereços dos servidores disponíveis
     * para um arquivo json.
     * 
     * @param {Object} servers Objeto contendo o endereço dos servidores disponíveis
     */
    static saveServersFile(servers){
        Util.fs.writeFileSync(Util.serversFile, JSON.stringify(servers));
    }

    /**
     * Obtém o endereço do servidor de destino de uma mensagem privada
     * @param {String} msg mensagem no formato login@endereco_servidor_destino:porta mensagem
     * @return o endereço do servidor de destino
     */
    static getDestinationServer(msg){
        /*
        Expressão regular que verifica se uma mensagem está no formato login@endereco_servidor_destino:porta mensagem,
        indicando que a mensagem é privada.
        A regex então permite extrair apenas o endereço do servidor de destino da mensagem.
        */
        const destinationServerRegex = /.+@(.+?)\s.+/;
        const groups = msg.match(destinationServerRegex);
        return groups[1];
    }

    /**
     * Obtém o login do usuário de destino de uma mensagem privada
     * @param {String} msg mensagem no formato login@endereco_servidor_destino:porta mensagem
     * @return o login do usuário de destino
     */
    static getDestinationLogin(msg){
        const groups = msg.match(Util.destinationLoginRegex);
        return groups[1];
    }

    /**
     * Verifica se uma mensagem é privada ou não
     * @param {String} msg mensagem a ser verificada
     * @return true se a mensagem é privada, false caso contrário
     */
    static isPrivateMsg(msg){
        return Util.destinationLoginRegex.test(msg);
    }

    /**
     * Gera um número aleatório de porta a ser utilizado por um servidor,
     * iniciando na porta 8001.
     */
    static randomPort(){
        return Math.round(Math.random()*2000 + Util.loadBalancerPort+1);
    }

    /**
     * Verifica se um servidor está disponível,
     * enviando uma requisição HTTP a  ele
     * @param {String} url endereço completo do servidor que deseja-se verificar, como http://localhost:8001
     * @return true se o servidor respondeu, false caso contrário
     */
    static hostAvailable(url) {
        const req = new Util.XMLHttpRequest();
        req.open('HEAD', url, false);
        req.send();
        return req.status == 200;
    }
} 

Util.serversFile = 'servers.json';

//Permitie enviar requisições HTTP para verificar se um servidor está online ou não.
Util.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
Util.fs = require('fs');

/*
Expressão regular que verifica se uma mensagem está no formato login@endereco_servidor_destino:porta mensagem,
indicando que a mensagem é privada.
A regex então permite extrair apenas o login do usuário de destino da mensagem.
*/
Util.destinationLoginRegex = /(.+@.+?)\s.+/;

//Porta padrão do balanceador de carga
Util.loadBalancerPort = 8000;
Util.loadBalancerAddress = `http://localhost:${Util.loadBalancerPort}`;

module.exports = Util;