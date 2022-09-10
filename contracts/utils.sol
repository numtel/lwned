// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library utils {
  function userInputFilter(string memory input) internal pure returns(bytes memory) {
    bytes memory output = `${input}`;
    // Keep the HTML safe but don't bother with &gt; or &lt; because that changes the length
    for(uint i=0; i<output.length; i++) {
      // Replace < with [
      if(output[i] == 0x3c) output[i] = 0x5b;
      // Replace > with ]
      if(output[i] == 0x3e) output[i] = 0x5d;
    }
    return output;
  }
}
