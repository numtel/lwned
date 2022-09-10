// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILensHub.sol";

contract MockLensHub is ILensHub {
  mapping(uint256 => ProfileStruct) public profiles;
  mapping(address => uint) public defaultProfile;

  function getProfile(uint256 profileId) external view returns (ProfileStruct memory) {
    return profiles[profileId];
  }

  function setProfile(uint256 profileId, ProfileStruct memory newOne) external {
    profiles[profileId] = newOne;
  }

  function setDefaultProfile(address wallet, uint profileId) external {
    defaultProfile[wallet] = profileId;
  }
}
