/**
 * Classe com métodos utilitários utilizados tanto pelo balanceador de carga como pelos servidores. 
 */
class Util{
    
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