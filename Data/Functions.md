<h1 align="center">Market Information (General)</h1>

```js
const nobitex = require('nobitex.js')
nobitex.price({ type: '' }).then(res => console.log(res))
// Will Return Few Last Trades Prices
```
```js
const nobitex = require('nobitex.js')
nobitex.trades({ type: '' }).then(res => console.log(res))
// Will Return Few Last Trades
```
```js
const nobitex = require('nobitex.js')
nobitex.market({ from: '', to: '' }).then(res => console.log(res))
// Will Return The Selected Crypto Changes
```
```js
const nobitex = require('nobitex.js')
nobitex.global().then(res => console.log(res))
// Will Return All Available Cryptos Prices In USD Format
```
<h1 align="center">Trading In The Market</h1>
When This Repo Get 25 ⭐️

<h1 align="center">User Information</h1>

```js
const nobitex = require('nobitex.js')
nobitex.account({ token: '' }).then(res => console.log(res))
// Will Return Account Info
```
```js
const nobitex = require('nobitex.js')
nobitex.CreateWallet({ token: '', type: '' }).then(res => console.log(res))
// Will Create Crypto Wallet For Selected Crypto
```
```js
const nobitex = require('nobitex.js')
nobitex.AddCard({ token: '', CardNumber: '', BankName: '' }).then(res => console.log(res))
// Will Add BankCard To Your Account
```
```js
const nobitex = require('nobitex.js')
nobitex.AddBankAccount({ token: '', CardNumber: '', Shaba: '', CardName: '' }).then(res => console.log
(res))
// Will Add BankAccount To Your Account
```
```js
const nobitex = require('nobitex.js')
nobitex.AccountLimitations({ token: '' }).then(res => console.log(res))
// Will Return Your Account Limitions
```
<h1 align="center">User financial information</h1>

```js
const nobitex = require('nobitex.js')
nobitex.AccountWallets({ token: '' }).then(res => console.log(res))
// Will Return Your Account Crypto Wallets
```
```js
const nobitex = require('nobitex.js')
nobitex.AccountBalance({ token:'' , type: '' }).then(res => console.log(res))
// Will Return Your Selected Crypto Stock
```

<h1 align="center">Security</h1>

```js
const nobitex = require('nobitex.js')
nobitex.LoginLog({ token }).then(res => console.log(res))
// Will Return Last Login Devices
```
```js
const nobitex = require('nobitex.js')
nobitex.EmergencyCancel({ token }).then(res => console.log(res))
// Will Gave You A Code For EmergencyCancel
```

<h1 align="center">Help</h1>

<h5>Price & Trade <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h5>
<h5>CreateWallet <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--createwallet-function--">Objects</a></h5>
<h5>Market (From & To) <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--market-function--">Objects</a></h5>
<h5>Token : Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h5>
<h5>CardNumber : Your Card Number Without Space </h5>
<h5>BankName : Your Card Bank Name In Persian Format</h5>
<h5>Shaba : Your Card Account <a href="https://www.ibena.ir/news/123905/%DA%A9%D8%AF-%D8%B4%D8%A8%D8%A7-%DA%86%DB%8C%D8%B3%D8%AA-%D9%88-%DA%86%D9%87-%DA%A9%D8%A7%D8%A8%D8%B1%D8%AF%DB%8C-%D8%AF%D8%A7%D8%B1%D8%AF">Shaba</a> Number </h5>
