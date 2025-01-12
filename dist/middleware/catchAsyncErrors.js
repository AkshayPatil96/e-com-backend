"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatchAsyncErrors = void 0;
const CatchAsyncErrors = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.CatchAsyncErrors = CatchAsyncErrors;
