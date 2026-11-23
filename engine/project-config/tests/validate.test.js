const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { validateProjectConfig } = require("../src/validate");

const taskflowConfig = path.resolve(
    __dirname,
    "../../../configs/projects/taskflow.yaml"
);

function testWithModifiedConfig(replacements, callback) {
    const original = fs.readFileSync(taskflowConfig, "utf8");
    let modified = original;

    for (const [search, replacement] of replacements) {
        assert.ok(modified.includes(search), `Could not find: ${search}`);
        modified = modified.replace(search, replacement);
    }

    const tempDir = fs.mkdtempSync(
        path.join(path.dirname(taskflowConfig), ".validator-test-")
    );

    const tempFile = path.join(tempDir, "test.yaml");
    fs.writeFileSync(tempFile, modified);

    try {
        callback(validateProjectConfig(tempFile));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
function testWithTemporarySource(files, callback) {
    const tempDir = fs.mkdtempSync(
        path.join(path.dirname(taskflowConfig), ".runtime-test-")
    );

    const relativeSourcePath = path.relative(
        path.resolve(__dirname, "../../../"),
        tempDir
    );

    for (const [fileName, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(tempDir, fileName), content);
    }

    const original = fs.readFileSync(taskflowConfig, "utf8");
    const modified = original.replace(
        "path: apps/backend-node",
        `path: ${relativeSourcePath}`
    );

    const configDir = fs.mkdtempSync(
        path.join(path.dirname(taskflowConfig), ".config-test-")
    );

    const configFile = path.join(configDir, "test.yaml");
    fs.writeFileSync(configFile, modified);

    try {
        callback(validateProjectConfig(configFile));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.rmSync(configDir, { recursive: true, force: true });
    }
}
test("accepts a valid TaskFlow configuration", () => {
    const result = validateProjectConfig(taskflowConfig);

    assert.equal(result.valid, true);
    assert.equal(result.project, "TaskFlow");
    assert.equal(result.slug, "taskflow");
    assert.equal(result.runtime, "node");
});

test("rejects an invalid project slug", () => {
    testWithModifiedConfig(
        [["slug: taskflow", "slug: TaskFlow_Invalid"]],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.length > 0);
        }
    );
});

test("rejects malformed YAML", () => {
    const tempDir = fs.mkdtempSync(os.tmpdir() + "/opspilot-");
    const tempFile = path.join(tempDir, "malformed.yaml");

    fs.writeFileSync(tempFile, "metadata:\n  name: [invalid");

    try {
        assert.throws(() => validateProjectConfig(tempFile));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("reports a missing configuration file", () => {
    assert.throws(
        () => validateProjectConfig("does-not-exist.yaml"),
        /Configuration file not found/
    );
});

test("rejects a missing Dockerfile", () => {
    testWithModifiedConfig(
        [["dockerfile: Dockerfile", "dockerfile: Missing.Dockerfile"]],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Dockerfile does not exist")
            ));
        }
    );
});

test("rejects a missing Compose file", () => {
    testWithModifiedConfig(
        [
            [
                "file: apps/backend-node/docker-compose.yml",
                "file: apps/backend-node/missing-compose.yml"
            ]
        ],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Compose file does not exist")
            ));
        }
    );
});

test("rejects a missing Kubernetes manifests directory", () => {
    testWithModifiedConfig(
        [
            [
                "manifests: infrastructure/kubernetes/taskflow",
                "manifests: infrastructure/kubernetes/missing"
            ]
        ],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Kubernetes manifests directory does not exist")
            ));
        }
    );
});

test("rejects source paths escaping the repository", () => {
    testWithModifiedConfig(
        [["path: apps/backend-node", "path: ../../.."]],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("escapes its permitted directory")
            ));
        }
    );
});

test("rejects a missing Ansible playbook", () => {
    testWithModifiedConfig(
        [
            [
                "playbook: infrastructure/ansible/playbooks/deploy_taskflow.yml",
                "playbook: infrastructure/ansible/playbooks/missing.yml"
            ]
        ],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Ansible playbook does not exist")
            ));
        }
    );
});

test("rejects a missing Ansible role directory", () => {
    testWithModifiedConfig(
        [
            [
                "role: infrastructure/ansible/roles/taskflow_deploy",
                "role: infrastructure/ansible/roles/missing_role"
            ]
        ],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Ansible role directory does not exist")
            ));
        }
    );
});

test("rejects source directories that resolve outside the repository through a symlink", () => {
    const outsideDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "opspilot-outside-")
    );

    const symlinkPath = path.join(
        path.dirname(taskflowConfig),
        ".validator-symlink-test"
    );

    try {
        fs.symlinkSync(outsideDir, symlinkPath, "dir");

        testWithModifiedConfig(
            [
                [
                    "path: apps/backend-node",
                    "path: configs/projects/.validator-symlink-test"
                ]
            ],
            result => {
                assert.equal(result.valid, false);
                assert.ok(result.errors.some(error =>
                    error.message.includes("resolves outside its permitted directory")
                ));
            }
        );
    } finally {
        fs.rmSync(symlinkPath, { force: true });
        fs.rmSync(outsideDir, { recursive: true, force: true });
    }
});

test("rejects Docker build contexts outside the application source directory", () => {
    testWithModifiedConfig(
        [
            [
                "context: .",
                "context: ../../infrastructure"
            ]
        ],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("escapes its permitted directory")
            ));
        }
    );
});

test("rejects a Node.js project missing package.json", () => {
    testWithTemporarySource(
        {
            "Dockerfile": "FROM node:22\n",
            "package-lock.json": "{}"
        },
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Node.js package manifest does not exist")
            ));
        }
    );
});

test("rejects a Node.js project missing package-lock.json", () => {
    testWithTemporarySource(
        {
            "Dockerfile": "FROM node:22\n",
            "package.json": '{"name":"test","version":"1.0.0"}'
        },
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Node.js lockfile does not exist")
            ));
        }
    );
});

test("rejects a Python project missing requirements.txt", () => {
    const pythonConfig = path.resolve(
        __dirname,
        "../../../configs/projects/fastapi-demo.yaml"
    );

    const modified = fs.readFileSync(pythonConfig, "utf8").replace(
        "path: apps/fastapi-demo",
        "path: apps/backend-node"
    );

    const tempDir = fs.mkdtempSync(
        path.join(path.dirname(pythonConfig), ".python-test-")
    );

    const configFile = path.join(tempDir, "test.yaml");
    fs.writeFileSync(configFile, modified);

    try {
        const result = validateProjectConfig(configFile);

        assert.equal(result.valid, false);
        assert.ok(result.errors.some(error =>
            error.message.includes("Python requirements file does not exist")
        ));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("rejects Node.js projects configured with an unsupported package manager", () => {
    testWithModifiedConfig(
        [["packageManager: npm", "packageManager: yarn"]],
        result => {
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(error =>
                error.message.includes("Node.js projects currently require npm")
            ));
        }
    );
});

test("rejects Python projects configured with an unsupported package manager", () => {
    const pythonConfig = path.resolve(
        __dirname,
        "../../../configs/projects/fastapi-demo.yaml"
    );

    const original = fs.readFileSync(pythonConfig, "utf8");
    const modified = original.replace(
        "packageManager: pip",
        "packageManager: poetry"
    );

    const tempDir = fs.mkdtempSync(
        path.join(path.dirname(pythonConfig), ".python-test-")
    );

    const configFile = path.join(tempDir, "test.yaml");
    fs.writeFileSync(configFile, modified);

    try {
        const result = validateProjectConfig(configFile);

        assert.equal(result.valid, false);
        assert.ok(result.errors.some(error =>
            error.message.includes("Python projects currently require pip")
        ));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
