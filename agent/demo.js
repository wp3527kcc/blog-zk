const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { stdin: input, stdout: output } = require("process");

let CursorAgentErrorClass;

const FALLBACK_MODELS = [
    { id: "auto", displayName: "Auto" },
    { id: "composer-latest", displayName: "Composer Latest" },
    { id: "composer-2", displayName: "Composer 2" },
    { id: "gpt-5.5", displayName: "GPT 5.5" },
];

loadDotEnv();
configureCursorSdkBinaries();

const TYPEWRITER_DELAY_MS = Number(process.env.TYPEWRITER_DELAY_MS ?? 8);

function loadDotEnv() {
    const envPaths = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(__dirname, "..", ".env"),
    ];
    const envPath = envPaths.find((candidate) => fs.existsSync(candidate));

    if (!envPath) {
        return;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function configureCursorSdkBinaries() {
    if (
        process.env.CURSOR_RIPGREP_PATH &&
        path.isAbsolute(process.env.CURSOR_RIPGREP_PATH) &&
        fs.existsSync(process.env.CURSOR_RIPGREP_PATH)
    ) {
        return;
    }

    const rgBinary = process.platform === "win32" ? "rg.exe" : "rg";
    const platformPackage = `sdk-${process.platform}-${process.arch}`;
    const directCandidate = path.resolve(
        process.cwd(),
        "node_modules",
        "@cursor",
        platformPackage,
        "bin",
        rgBinary,
    );
    const pnpmCandidate = findPnpmCursorSdkBinary(platformPackage, rgBinary);
    const rgPath = [directCandidate, pnpmCandidate].find((candidate) => candidate && fs.existsSync(candidate));

    if (rgPath) {
        process.env.CURSOR_RIPGREP_PATH = rgPath;
    }
}

function findPnpmCursorSdkBinary(platformPackage, binaryName) {
    const pnpmDir = path.resolve(process.cwd(), "node_modules", ".pnpm");
    if (!fs.existsSync(pnpmDir)) {
        return undefined;
    }

    const packagePrefix = `@cursor+${platformPackage}@`;
    const packageDir = fs
        .readdirSync(pnpmDir, { withFileTypes: true })
        .find((entry) => entry.isDirectory() && entry.name.startsWith(packagePrefix));

    if (!packageDir) {
        return undefined;
    }

    return path.resolve(
        pnpmDir,
        packageDir.name,
        "node_modules",
        "@cursor",
        platformPackage,
        "bin",
        binaryName,
    );
}

function normalizeModel(model) {
    return {
        id: model.id,
        displayName: model.displayName ?? model.id,
        aliases: model.aliases ?? [],
    };
}

function isNode20OrNewer() {
    const major = Number(process.versions.node.split(".")[0]);
    return major >= 20;
}

async function getAvailableModels(Cursor, apiKey) {
    try {
        const models = await Cursor.models.list({ apiKey });
        return models.length > 0 ? models.map(normalizeModel) : FALLBACK_MODELS;
    } catch (error) {
        console.warn("无法拉取模型列表，将使用内置候选模型。");
        return FALLBACK_MODELS;
    }
}

async function selectModel(rl, models) {
    console.log("\n可选模型：");
    models.forEach((model, index) => {
        const aliases = model.aliases.length > 0 ? `（别名：${model.aliases.join(", ")}）` : "";
        console.log(`${index + 1}. ${model.displayName} - ${model.id}${aliases}`);
    });

    const answer = (await rl.questionAsync("\n请选择模型序号，或直接输入模型 ID：")).trim();
    const selectedIndex = Number(answer) - 1;

    if (Number.isInteger(selectedIndex) && models[selectedIndex]) {
        return models[selectedIndex].id;
    }

    if (answer) {
        return answer;
    }

    return models[0].id;
}

async function readPrompt(rl) {
    console.log("\n请输入提示词，输入空行结束：");

    const lines = [];
    while (true) {
        const line = await rl.questionAsync("> ");
        if (line === "") {
            break;
        }
        lines.push(line);
    }

    return lines.join("\n").trim();
}

async function writeTypewriter(text) {
    for (const char of text) {
        output.write(char);
        if (TYPEWRITER_DELAY_MS > 0) {
            await new Promise((resolve) => setTimeout(resolve, TYPEWRITER_DELAY_MS));
        }
    }
}

async function streamAssistantText(run) {
    if (!run.supports("stream")) {
        throw new Error(`当前运行不支持流式输出：${run.unsupportedReason("stream") ?? "未知原因"}`);
    }

    for await (const event of run.stream()) {
        if (event.type !== "assistant") {
            continue;
        }

        for (const block of event.message.content) {
            if (block.type === "text") {
                await writeTypewriter(block.text);
            }
        }
    }
}

async function main() {
    if (!isNode20OrNewer()) {
        console.error(`当前 Node.js 版本为 ${process.versions.node}，请先执行 use20 切换到 Node.js 20。`);
        process.exitCode = 1;
        return;
    }

    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) {
        console.error("请先设置环境变量 CURSOR_API_KEY，再运行此脚本。");
        process.exitCode = 1;
        return;
    }

    let rl;
    let agent;

    try {
        const { Agent, Cursor, CursorAgentError } = require("@cursor/sdk");
        CursorAgentErrorClass = CursorAgentError;

        const models = await getAvailableModels(Cursor, apiKey);
        rl = readline.createInterface({ input, output });
        rl.questionAsync = (question) => new Promise((resolve) => rl.question(question, resolve));

        const modelId = await selectModel(rl, models);
        const prompt = await readPrompt(rl);

        if (!prompt) {
            console.error("提示词不能为空。");
            process.exitCode = 1;
            return;
        }

        agent = await Agent.create({
            apiKey,
            model: { id: modelId },
            local: { cwd: process.cwd() },
        });

        console.log(`\n正在使用 ${modelId} 生成回复：\n`);
        const run = await agent.send(prompt);

        await streamAssistantText(run);
        const result = await run.wait();

        console.log("\n");
        if (result.status !== "finished") {
            console.error(`运行未正常结束，状态：${result.status}`);
            process.exitCode = 2;
        }
    } catch (error) {
        if (CursorAgentErrorClass && error instanceof CursorAgentErrorClass) {
            console.error(`Cursor SDK 启动失败：${error.message}`);
            process.exitCode = 1;
            return;
        }

        console.error(error);
        process.exitCode = 1;
    } finally {
        if (rl) {
            rl.close();
        }
        if (agent) {
            await agent[Symbol.asyncDispose]();
        }
    }
}

main();