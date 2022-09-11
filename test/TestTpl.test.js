const assert = require('assert');

exports.placesValuesInsideTemplates = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const instance = await deployContract(accounts[0], 'TestTpl');
  await instance.sendFrom(accounts[0]).setValue(123);
  const out = decodeAscii(await instance.methods.render().call());
  assert.strictEqual(out, '<p>123</p>');
};

exports.index = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const frontend = await deployContract(accounts[0], 'LwnedFrontendIndex',
    factory.options.address, BURN_ACCOUNT, BURN_ACCOUNT);
  const out = decodeAscii(await frontend.methods.render().call());
  assert.notStrictEqual(out.indexOf('Pending loan count: 0'), -1);
};


function decodeAscii(input) {
  let out = '';
  for(let i = 2; i<input.length; i+=2) {
    out += String.fromCharCode(parseInt(input.slice(i, i+2), 16));
  }
  return out;
}
