// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SSTORE2 minimal library
/// @notice Write and read arbitrary-length bytes to contract bytecode for cheaper storage.
/// @dev This is a minimal variant: writes deploy a contract with code = 0x00 || data,
///      reads use extcodecopy skipping the first STOP byte.
library SSTORE2 {
    error WriteError();

    function write(bytes memory data) internal returns (address pointer) {
        // Prefix with a single 0x00 byte so code can be read entirely via extcodecopy starting at offset 1.
        bytes memory code = bytes.concat(bytes1(0x00), data);
        assembly {
            // create(value, codePtr, codeSize)
            pointer := create(0, add(code, 0x20), mload(code))
        }
        if (pointer == address(0)) revert WriteError();
    }

    function read(address pointer) internal view returns (bytes memory data) {
        uint256 size;
        assembly {
            size := extcodesize(pointer)
        }
        if (size == 0) return bytes("");
        unchecked {
            size -= 1; // skip the first 0x00 byte
        }
        data = new bytes(size);
        assembly {
            extcodecopy(pointer, add(data, 0x20), 1, size)
        }
    }

    function read(address pointer, uint256 start, uint256 end) internal view returns (bytes memory data) {
        uint256 size;
        assembly {
            size := extcodesize(pointer)
        }
        if (size == 0) return bytes("");
        unchecked {
            size -= 1; // adjust for prefix
        }
        if (end > size) end = size;
        if (start >= end) return bytes("");
        uint256 len = end - start;
        data = new bytes(len);
        assembly {
            extcodecopy(pointer, add(data, 0x20), add(start, 1), len)
        }
    }
}
