// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILensHub {
  struct ProfileStruct {
    uint256 pubCount;
    address followModule;
    address followNFT;
    string handle;
    string imageURI;
    string followNFTURI;
  }

  function defaultProfile(address wallet) external view returns (uint256);
  function getProfile(uint256 profileId) external view returns (ProfileStruct memory);
}
