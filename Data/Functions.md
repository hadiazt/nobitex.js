<h1 align="center">nobitex.js Function Menu</h1>

<h2>Price :</h2>

```js
const nobitex = require(nobitex.js)
nobitex.price({type:''}).then(res => console.log(res))
```
<h5>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h5>
<h2>Trades :</h2>

```js
const nobitex = require(nobitex.js)
nobitex.trades({ type: '' }).then(res => console.log(res))
```
<h5>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--price--trade-functions--">Objects</a></h5>


<h2>Market :</h2>

```js
const nobitex = require(nobitex.js)
nobitex.market({ from: '', to: ''}).then(res => console.log(res))
```
<h5>From & To<a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--market-function--">Objects</a></h5>

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
<h5>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h5>

<h2>CreateWallet : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.CreateWallet({ token: '', type: '' }).then(res => console.log(res))
```
<h5>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h5>
<h5>Type <a href="https://github.com/hadiazt/nobitex.js/blob/main/Data/Objects.md#--createwallet-function--">Objects</a></h5>

<h2> AddCard : </h2>

```js
const nobitex = require(nobitex.js)
nobitex.AddCard({ token: '', CardNumber: '', BankName: '' }).then(res => console.log(res))
```
<h5>Your Nobitex Account Sercet <a href="https://nobitex.ir/app/settings/">Token</a></h5>
<h5>CardNumber : Your Card Number Witout Space </h5>
<h5>BankName : Your Card Bank Name In Persian Format </h5>
