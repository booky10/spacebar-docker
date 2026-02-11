#!/usr/bin/env node

import * as child_process from "node:child_process";

const database = process.env.DATABASE;
if (!database.startsWith("postgres://")) {
    console.error("Database pre-configuration is only supported if using postgres, skipped");
    process.exit(0);
}

import {Client} from "pg";

// don't need to wait until postgres has started, our docker
// compose project has a built-in healthcheck
const client = new Client({connectionString: database});
await client.connect();

const update = async (key/**string*/, value/**any*/) => {
    const readResult = await client.query(`
        SELECT value
        FROM config
        WHERE key = $1
    `, [key]);
    if (readResult.rowCount < 1) {
        throw new Error(`Can't find config key ${key} in database`);
    }

    let dbValue = value ? JSON.stringify(value) : null;
    if (readResult.rows[0].value === dbValue) {
        return; // already correct value
    }
    console.log(`Updating config entry "${key}" to value`, dbValue);

    await client.query(`
        UPDATE config
        SET value = $2
        WHERE key = $1
    `, [key, dbValue]);
};

// calls configuration logic
const execConfig = async (firstStart/**boolean*/) => {
    /** @type string */
    const endpoint = process.env.SPACEBAR_SERVER_URL;
    const wsEndpoint = endpoint.replace("http", "ws"); // https -> wss
    // update endpoint values
    await update("api_endpointPublic", `${endpoint}/api/v9`);
    await update("cdn_endpointPrivate", `${endpoint}/cdn`);
    await update("cdn_endpointPublic", `${endpoint}/cdn`);
    await update("cdn_imagorServerUrl", `${endpoint}/img`);
    await update("gateway_endpointPrivate", wsEndpoint);
    await update("gateway_endpointPublic", wsEndpoint);

    // some config values configurable via environment variables
    await update("general_serverName", process.env.SPACEBAR_LANDING_URL);
    await update("general_instanceName", process.env.INSTANCE_NAME);
    await update("general_instanceDescription", process.env.INSTANCE_DESC);
    await update("general_correspondenceEmail", process.env.INSTANCE_CONTACT_EMAIL);
    await update("general_correspondenceUserID", process.env.INSTANCE_CONTACT_USER_ID);
    await update("general_frontPage", process.env.INSTANCE_HOMEPAGE_URL);
    await update("general_tosPage", process.env.INSTANCE_TOS_URL);

    // internal connection
    await update("rabbitmq_host", "amqp://guest:guest@rabbitmq:5672");

    // some more sane default values
    if (firstStart) {
        await update("passwordReset_requireCaptcha", true);
        await update("limits_rate_enabled", true);
        // default limit is 7 req/s per ip, resets every 10s
        await update("limits_rate_ip_count", 70);
        await update("limits_rate_ip_window", 10);
        // setup cdn url signing
        await update("security_cdnSignUrls", true);
        await update("security_cdnSignatureDuration", "8h");
    }

    // gracefully shutdown connection
    await client.end();

    console.log("Finished configuration logic, proceeding with spacebar server launch...");
};

const checkLoaded = async () => {
    // determine whether the "config" table exists or not
    const existsResult = await client.query(`
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'config';
    `);
    if (existsResult.rowCount < 1) {
        return false;
    }
    // determine whether the config table has entries or not
    const contentsResult = await client.query(`
        SELECT
        FROM config LIMIT 1
    `);
    return contentsResult.rowCount > 0;
};
// check whether the database has been initialized yet
if (!(await checkLoaded())) {
    console.log("Database isn't initialized yet, launching temporary server for initialization...");
    // extract spacebar server launch args from process argv
    const launchCli = process.argv.slice(2);
    const launchArgs = launchCli.slice(1);
    // spawn child process to initialize database
    const spacebarServer = child_process.spawn(
            launchCli[0], launchArgs, {
                stdio: ["inherit", "pipe", "inherit"],
                // force thread count to 1, using more than one thread requires rabbitmq to be setup
                env: {...process.env, THREADS: "1"},
            });
    // pipe to parent stdout
    spacebarServer.stdout.pipe(process.stdout);
    // listen for stdout messages
    spacebarServer.stdout.on("data", (chunk) => {
        if (chunk instanceof Buffer) {
            const message = chunk.toString("utf-8");
            if (message.includes("listening on port")) {
                console.log("Temporary server has finished booting, shutting down in 1s...");
                setTimeout(() => spacebarServer.kill("SIGTERM"), 1000);
            }
        }
    });

    // setup timeout if server hangs for some reason
    setTimeout(() => {
        if (spacebarServer.exitCode !== null) {
            return; // already exited
        }
        spacebarServer.kill("SIGTERM"); // gracefully termination
        // kill if graceful termination doesn't work
        setTimeout(() => {
            if (spacebarServer.exitCode === null) {
                console.error("Temporary server still running after termination, sending kill signal");
                spacebarServer.kill("SIGKILL");
            }
        }, 5 * 1000);
    }, 10 * 1000);

    // after the init server has exited, continue processing
    spacebarServer.on("exit", async (code) => {
        if (!(await checkLoaded())) {
            console.error("Initial server initialization failed!");
            return process.exit(code);
        } else {
            console.log("Finished database initialization, applying configuration...");
            await execConfig(true);
        }
    });
} else {
    // server has started at least once already, execute normal config
    await execConfig(false);
}
