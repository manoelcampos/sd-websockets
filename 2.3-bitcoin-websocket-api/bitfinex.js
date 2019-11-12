/**
 * Aplicação que usa a API do serviço bitfinex
 * para obter a cotação do BitCoin (e outroas criptomoedas).
 * É enviada requisição para assinar um canal por onde
 * a aplicação receberá notificações sempre que o preço
 * da criptomoeda solicitada mudar.
 * 
 * https://docs.bitfinex.com/v2/reference#ws-public-ticker
 */

//Biblioteca cliente de WebSocket
const WebSocket = require('ws')

//Mensagem pra solicitar assinatura de cotação do valor do BitCoin em dolar.
const subscriptionMsg = {
  event: 'subscribe',
  channel: 'ticker',
  from: 'BTC',
  to: 'USD'
}

//Campo exibido pela API do bitfinex
subscriptionMsg.symbol = 't' + subscriptionMsg.from + subscriptionMsg.to

//Endereço de acesso ao serviço (API)
const ws = new WebSocket('wss://api-pub.bitfinex.com/ws/2')

//Id do canal por onde as notificações de preço da criptomoeda serão entregues
let channelId = 0

/**
 * Registra um listener para indicar que, sempre
 * que uma mensagem for recebida pela conexão de websocket,
 * deve-se verificar o tipo da mensagem e extrair algum
 * informação dela.
*/
ws.onmessage = (msg) => {
  //Se o conteúdo da mensagem for String, tal comando converte para JSON,
  //ou seja, para um objeto javascript que poderemos acessar os campos facilmente.
  msg.data = JSON.parse(msg.data)

  /*Se o tipo do evento for 'subscribed', que a assinatura no canal para receber 
  cotação de uma determinada criptomoeda foi aceita*/
  if (msg.data['event'] === 'subscribed'){
    //Obtém o id do canal da nossa assinatura para podermos exibir mensagens recebidas apenas deste canal
    channelId = msg.data.chanId
    console.log('Registrada assinatura de cotação de ' + subscriptionMsg.from + ' para ' + subscriptionMsg.to)
  } else if (msg.data[0] === channelId){
    /*Se a mensagem recebida for do canal ao qual fomos registrados anteriormente, 
    então imprime os dados da mensagem.
    O conteúdo da mensagem é descrito no link no início deste arquivo*/
    if (msg.data[1][6] !== undefined){
      console.log(subscriptionMsg.from + ' = ' + subscriptionMsg.to + ' ' + msg.data[1][6])
    }
  }
}

//Envia solicitação de assinatura para ficar recebendo a cotação de uma criptomoeda em tempo real
ws.on('open', () => ws.send(JSON.stringify(subscriptionMsg)))