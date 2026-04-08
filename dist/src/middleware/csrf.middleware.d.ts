import type { RequestHandler } from "express";
/** Sets CSRF cookie + returns token in JSON for clients that need it */
export declare const csrfBootstrap: RequestHandler;
export declare const csrfProtect: RequestHandler;
