const babel = require('@babel/core');
const plugin = require('../src/index');

it('foo is an alias to baz', () => {
    var input = `
        glodash.cloneDeep();
    `
    var {code} = babel.transform(input, {plugins: [plugin]});
    console.log(1111, code)
})