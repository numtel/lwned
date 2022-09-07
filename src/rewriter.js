process.stdin.on('readable', async () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
    const data = chunk.toString('utf8');
    process.stdout.write(replaceTplStrings(data));
    process.exit(0);
  }
});

function replaceTplStrings(input) {
  const parts = input.split('`');
  for(let i = 1; i<parts.length; i+=2) {
    const curParts = parts[i].replace(/\n/g, '').split('${');
    for(let j = 0; j<curParts.length; j++) {
      if(j>0) {
        const closeBrace = curParts[j].indexOf('}');
        if(closeBrace === -1) throw new Error('Fooey');
        curParts[j] = curParts[j].slice(0, closeBrace) + ',"' + curParts[j].slice(closeBrace + 1) + '"';
      } else {
        curParts[j] = '"' + curParts[j] + '"';
      }
    }
    parts[i] = `abi.encodePacked(${curParts.join(',')})`;
  }
  return parts.join('');
}
