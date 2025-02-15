// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.24;

import "./IERC721.sol";

contract ERC721 is IERC721{
    // Mapping
    mapping(uint256 => address) internal _ownerOf;
    mapping(address => uint256) internal _balanceOf;

    // event
    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    
    function _mint(address to, uint256 tokenId) internal{
        require(to != address(0), "mint to zero address");
        require(_ownerOf[tokenId] == address(0), "already minted");

        _balanceOf[to]++;
        _ownerOf[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

}