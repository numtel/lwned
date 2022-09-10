// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
  function addressIdHash(address toCheck) external view returns(bytes32);

  function isOver18(address toCheck) external view returns (bool);
  function isOver21(address toCheck) external view returns (bool);
  function getCountryCode(address toCheck) external view returns (uint);
}
