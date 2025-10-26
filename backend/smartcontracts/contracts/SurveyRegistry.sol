// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SSTORE2} from "./lib/SSTORE2.sol";

contract SurveyRegistry {
    enum Status { None, Submitted, Approved, Rejected }
    struct Record {
        uint256 projectId;
        string ipfsCid;
        string checksum;
        Status status;
        address submitter;
    }

    mapping(uint256 => Record) public surveys;
    // Per-survey file hashes (e.g., SHA-256 as bytes32)
    mapping(uint256 => bytes32[]) private _fileHashes;
    // Optional on-chain file bytes, stored chunked (WARNING: expensive on public chains)
    mapping(uint256 => bytes[]) private _fileChunks;
    // Encrypted file chunks stored via SSTORE2 pointers per survey
    mapping(uint256 => address[]) private _encPointers;

    // Backend-expected events (see smartcontracts/abi/survey_registry.json)
    event Submitted(uint256 surveyId, uint256 projectId, string ipfsCid, string checksum, address actor, uint256 ts);
    event Approved(uint256 surveyId, address actor, uint256 ts);
    event Rejected(uint256 surveyId, address actor, uint256 ts);
    // New event for per-file hash attachments
    event FileAttached(uint256 surveyId, bytes32 checksum, address actor, uint256 ts);
    // New events for chunked file storage
    event FileChunk(uint256 surveyId, uint256 index, uint256 size, bytes32 chunkHash, address actor, uint256 ts);
    // Encrypted chunk stored via SSTORE2 pointer
    event EncryptedChunkStored(uint256 surveyId, uint256 index, address pointer, uint256 size, bytes32 chunkHash, address actor, uint256 ts);

    function recordSubmission(uint256 surveyId, uint256 projectId, string memory ipfsCid, string memory checksum) external {
        Record storage r = surveys[surveyId];
        r.projectId = projectId;
        r.ipfsCid = ipfsCid;
        r.checksum = checksum;
        r.status = Status.Submitted;
        r.submitter = msg.sender;
        emit Submitted(surveyId, projectId, ipfsCid, checksum, msg.sender, block.timestamp);
    }

    function markApproved(uint256 surveyId) external {
        Record storage r = surveys[surveyId];
        r.status = Status.Approved;
        emit Approved(surveyId, msg.sender, block.timestamp);
    }

    function markRejected(uint256 surveyId) external {
        Record storage r = surveys[surveyId];
        r.status = Status.Rejected;
        emit Rejected(surveyId, msg.sender, block.timestamp);
    }

    // Append a file hash (bytes32) to a survey's attachments list
    function addFileHash(uint256 surveyId, bytes32 checksum) external {
        require(surveys[surveyId].submitter != address(0), "SURVEY_NOT_FOUND");
        _fileHashes[surveyId].push(checksum);
        emit FileAttached(surveyId, checksum, msg.sender, block.timestamp);
    }

    // Return all file hashes for a survey
    function getFileHashes(uint256 surveyId) external view returns (bytes32[] memory) {
        return _fileHashes[surveyId];
    }

    // Chunked file storage API (unencrypted; expensive)
    function addFileChunk(uint256 surveyId, bytes calldata chunk) external {
        require(surveys[surveyId].submitter != address(0), "SURVEY_NOT_FOUND");
        _fileChunks[surveyId].push(chunk);
        uint256 idx = _fileChunks[surveyId].length - 1;
        emit FileChunk(surveyId, idx, chunk.length, keccak256(chunk), msg.sender, block.timestamp);
    }

    function addFileChunks(uint256 surveyId, bytes[] calldata chunks) external {
        require(surveys[surveyId].submitter != address(0), "SURVEY_NOT_FOUND");
        for (uint256 i = 0; i < chunks.length; i++) {
            _fileChunks[surveyId].push(chunks[i]);
            emit FileChunk(surveyId, _fileChunks[surveyId].length - 1, chunks[i].length, keccak256(chunks[i]), msg.sender, block.timestamp);
        }
    }

    function getFileChunkCount(uint256 surveyId) external view returns (uint256) {
        return _fileChunks[surveyId].length;
    }

    function getFileChunk(uint256 surveyId, uint256 index) external view returns (bytes memory) {
        return _fileChunks[surveyId][index];
    }

    // Encrypted storage via SSTORE2
    function addEncryptedChunks(uint256 surveyId, bytes[] calldata payloads) external {
        require(surveys[surveyId].submitter != address(0), "SURVEY_NOT_FOUND");
        for (uint256 i = 0; i < payloads.length; i++) {
            address ptr = SSTORE2.write(payloads[i]);
            _encPointers[surveyId].push(ptr);
            emit EncryptedChunkStored(surveyId, _encPointers[surveyId].length - 1, ptr, payloads[i].length, keccak256(payloads[i]), msg.sender, block.timestamp);
        }
    }

    function getEncryptedChunkCount(uint256 surveyId) external view returns (uint256) {
        return _encPointers[surveyId].length;
    }

    function getEncryptedChunkPointer(uint256 surveyId, uint256 index) external view returns (address) {
        return _encPointers[surveyId][index];
    }

    function readEncryptedChunk(uint256 surveyId, uint256 index) external view returns (bytes memory) {
        return SSTORE2.read(_encPointers[surveyId][index]);
    }
}
