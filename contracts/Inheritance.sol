// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract A {
    function olive() public pure virtual returns (string memory) {
        return "Galilee";
    }

    function alice() public pure returns (string memory) {
        return "Alice";
    }
}

contract B is A {
    function olive() public pure virtual override returns (string memory) {
        return "Bethesda";
    }

    function bob() public pure returns (string memory) {
        return "Bob";
    }
}

contract C is B {
    function olive() public pure virtual override returns (string memory) {
        return "Judea";
    }

    function charles() public pure returns (string memory) {
        return "Charles";
    }
}

contract D is A, B {
    function olive() public pure virtual override(A, B) returns (string memory) {
        return (super.olive());
    }

    function clove() public pure returns (string memory, string memory, string memory) {
        return (super.olive(), A.alice(), super.bob());
    }
}
