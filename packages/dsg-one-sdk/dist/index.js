"use strict";
/**
 * DSG ONE SDK - Main entry point
 *
 * A TypeScript client for the DSG ONE governed execution API.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DsgOneError = exports.createClientFromEnv = exports.createClient = exports.DsgOneClient = void 0;
// Main client
var client_1 = require("./client");
Object.defineProperty(exports, "DsgOneClient", { enumerable: true, get: function () { return client_1.DsgOneClient; } });
Object.defineProperty(exports, "createClient", { enumerable: true, get: function () { return client_1.createClient; } });
Object.defineProperty(exports, "createClientFromEnv", { enumerable: true, get: function () { return client_1.createClientFromEnv; } });
var types_1 = require("./types");
Object.defineProperty(exports, "DsgOneError", { enumerable: true, get: function () { return types_1.DsgOneError; } });
//# sourceMappingURL=index.js.map