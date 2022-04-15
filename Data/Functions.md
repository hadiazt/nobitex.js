<h1 align="center">nobitex.js Function Menu</h1>

<h2>Price :</h2>

```js
const nobitex = require(nobitex.js)
nobitex.price({type:''}).then(res => console.log(res))
```
<h6>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h6>
<h2>Trades :</h2>

```js
const nobitex = require(nobitex.js)
nobitex.trades({ type: '' }).then(res => console.log(res))
```
<h6>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h6>


<h2>Market :</h2>

```js
const nobitex = require(nobitex.js)
nobitex.market({ from: '', to: ''}).then(res => console.log(res))
```
<h6>From & To<a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--market-function--">Objects</a></h6>

<h2>Global : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.global().then(res => console.log(res))
```
<h2>Account : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.account({ token: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>

<h2>CreateWallet : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.CreateWallet({ token: '', type: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>
<h6>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--createwallet-function--">Objects</a></h6>

<h2> AddCard : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.AddCard({ token: '', CardNumber: '', BankName: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>
<h6>CardNumber : Your Card Number Witout Space </h6>
<h6>BankName : Your Card Bank Name In Persian Format </h6>

<h2> AddBankAccount : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.AddBankAccount({ token: '', CardNumber: '', Shaba: '', CardName: '' }).then(res => console.log(res))
```
<h6>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h6>
<h6>CardNumber : Your Card Number Witout Space </h6>
<h6>Shaba : Your Card Account <a href="https://www.ibena.ir/news/123905/%DA%A9%D8%AF-%D8%B4%D8%A8%D8%A7-%DA%86%DB%8C%D8%B3%D8%AA-%D9%88-%DA%86%D9%87-%DA%A9%D8%A7%D8%A8%D8%B1%D8%AF%DB%8C-%D8%AF%D8%A7%D8%B1%D8%AF">Shaba</a> Number </h6>
<h6>BankName : Your Card Bank Name In Persian Format </h6>