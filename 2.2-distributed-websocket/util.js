//Permite enviar requisições HTTP de forma síncrona ou assíncrona para verificar se um servidor está online ou não.
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

//Porta padrão do balanceador de carga
const loadBalancerPort = 8000;
const loadBalancerAddress = `http://localhost:${loadBalancerPort}`;

/**
 * Gera um número aleatório de porta a ser utilizado por um servidor,
 * iniciando na porta 8001.
 */
function randomPort(){
    return Math.round(Math.random()*2000 + loadBalancerPort+1);
}

/**
 * Verifica se um servidor está disponível,
 * enviando uma requisição HTTP a ele
 * @param {String} url endereço completo do servidor que deseja-se verificar, como http://localhost:8001
 * @return true se o servidor respondeu, false caso contrário
 */
function isHostAvailable(url) {
    const req = new XMLHttpRequest();
    req.open('HEAD', url, false);
    req.send();
    return req.status == 200;
}


module.exports = { randomPort, isHostAvailable, loadBalancerPort, loadBalancerAddress };