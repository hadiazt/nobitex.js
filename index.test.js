const nobitex = require('./src/main')
// const nobitex = require(nobitex.js)
const { token } = require('./file.json')


// nobitex.price({type:'BTCIRT'}).then(res => console.log(res))
// nobitex.trades({ type: 'BTCIRT' }).then(res => console.log(res))

// BTCIRT, ETHIRT, LTCIRT, XRPIRT, BCHIRT, BNBIRT, EOSIRT
// XLMIRT, ETCIRT, TRXIRT, DOGEIRT, UNIIRT, DAIIRT, LINKIRT
// DOTIRT, AAVEIRT, ADAIRT, SHIBIRT, USDTIRT, BTCUSDT, ETHUSDT
// LTCUSDT, XRPUSDT, BCHUSDT, BNBUSDT, EOSUSDT, XLMUSDT, ETCUSDT 
// TRXUSDT, PMNUSDT, DOGEUSDT, UNIUSDT, DAIUSDT, LINKUSDT, DOTUSDT
// AAVEUSDT, ADAUSDT, SHIBUSDT


// nobitex.market({from:'btc',to:'rls'}).then(res => console.log(res))
/* From Options : */
// rls, btc, eth, ltc, usdt, xrp, bch, bnb, 
// eos, xlm, etc, trx, pmn, doge, uni, dai, 
// link, dot, aave, ada, shib

/* To Options : */
// usdt , rls

// nobitex.global().then(res => console.log(res))

nobitex.account({ token: token }).then(res => console.log(res))