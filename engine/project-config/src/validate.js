
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const Ajv2020 = require("ajv/dist/2020");

const REPO_ROOT = path.resolve(__dirname, "../../..");

function isInsideDirectory(parent, target) {
    const relative = path.relative(parent, target);

    return (
        relative === "" ||
        (
            relative !== ".." &&
            !relative.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relative)
        )
    );
}

/**
 * Resolve an existing path and ensure that both its lexical path
 * and its real path (after following symlinks) remain inside
 * the permitted boundary.
 */
function resolveExistingInside(relativePath, baseDirectory, boundaryDirectory, description) {
    const candidate = path.resolve(baseDirectory, relativePath);
    const boundary = path.resolve(boundaryDirectory);

    if (!isInsideDirectory(boundary, candidate)) {
        throw new Error(`${description} escapes its permitted directory: ${relativePath}`);
    }

    if (!fs.existsSync(candidate)) {
        throw new Error(`${description} does not exist: ${relativePath}`);
    }

    const realBoundary = fs.realpathSync(boundary);
    const realCandidate = fs.realpathSync(candidate);

    if (!isInsideDirectory(realBoundary, realCandidate)) {
        throw new Error(`${description} resolves outside its permitted directory: ${relativePath}`);
    }

    return realCandidate;
}

function validateProjectConfig(configPath) {
    const absoluteConfigPath = path.resolve(REPO_ROOT, configPath);
    const schemaPath = path.join(
        REPO_ROOT,
        "configs/schemas/project.schema.json"
    );

    if (!fs.existsSync(absoluteConfigPath)) {
        throw new Error(`Configuration file not found: ${absoluteConfigPath}`);
    }

    if (!fs.existsSync(schemaPath)) {
        throw new Error(`JSON Schema not found: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const yamlContent = fs.readFileSync(absoluteConfigPath, "utf8");
    const config = YAML.parse(yamlContent, { uniqueKeys: true });

    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validate = ajv.compile(schema);

    if (!validate(config)) {
        return {
            valid: false,
            errors: validate.errors.map(error => ({
                path: error.instancePath || "/",
                message: error.message
            }))
        };
    }

    const errors = [];
    const spec = config.spec;

    function checkPath(relativePath, description, baseDirectory = REPO_ROOT, boundaryDirectory = REPO_ROOT, expectedType = "file") {
        try {
            const resolvedPath = resolveExistingInside(
                relativePath,
                baseDirectory,
                boundaryDirectory,
                description
            );

            const stats = fs.statSync(resolvedPath);
            const correctType = expectedType === "directory"
                ? stats.isDirectory()
                : stats.isFile();

            if (!correctType) {
                errors.push(
                    `${description} is not a ${expectedType}: ${relativePath}`
                );
            }
        } catch (error) {
            errors.push(error.message);
        }
    }

    let sourceDirectory;

    try {
        sourceDirectory = resolveExistingInside(
            spec.source.path,
            REPO_ROOT,
            REPO_ROOT,
            "Source directory"
        );

        if (!fs.statSync(sourceDirectory).isDirectory()) {
            errors.push(`Source path is not a directory: ${spec.source.path}`);
            sourceDirectory = null;
        }
    } catch (error) {
        errors.push(error.message);
    }
    if (sourceDirectory) {
        checkPath(
            spec.build.dockerfile,
            "Dockerfile",
            sourceDirectory,
            sourceDirectory,
            "file"
        );

        checkPath(
            spec.build.context,
            "Docker build context",
            sourceDirectory,
            sourceDirectory,
            "directory"
        );

        const runtime = spec.runtime;

        if (runtime.language === "node") {
            if (runtime.packageManager !== "npm") {
                errors.push("Node.js projects currently require npm");
            } else {
                checkPath("package.json", "Node.js package manifest", sourceDirectory, sourceDirectory);
                checkPath("package-lock.json", "Node.js lockfile", sourceDirectory, sourceDirectory);
            }
        }

        if (runtime.language === "python") {
            if (runtime.packageManager !== "pip") {
                errors.push("Python projects currently require pip");
            } else {
                checkPath("requirements.txt", "Python requirements file", sourceDirectory, sourceDirectory);
            }
        }
    }
    const targets = spec.deployment.targets;

    if (targets.includes("compose")) {
        if (!spec.deployment.compose) {
            errors.push("Compose deployment requires deployment.compose.file");
        } else {
            checkPath(
                spec.deployment.compose.file,
                "Compose file"
            );
        }
    }

    if (targets.includes("ansible")) {
        if (!spec.deployment.ansible) {
            errors.push(
                "Ansible deployment requires deployment.ansible.playbook and deployment.ansible.role"
            );
        } else {
            checkPath(
                spec.deployment.ansible.playbook,
                "Ansible playbook"
            );

            checkPath(
                spec.deployment.ansible.role,
                "Ansible role directory",
                REPO_ROOT,
                REPO_ROOT,
                "directory"
            );
        }
    }

    if (targets.includes("kubernetes")) {
        if (!spec.deployment.kubernetes) {
            errors.push(
                "Kubernetes deployment requires deployment.kubernetes.manifests"
            );
        } else {
            checkPath(
                spec.deployment.kubernetes.manifests,
                "Kubernetes manifests directory",
                REPO_ROOT,
                REPO_ROOT,
                "directory"
            );
        }
    }

    return errors.length
        ? {
            valid: false,
            errors: errors.map(message => ({ message }))
        }
        : {
            valid: true,
            project: config.metadata.name,
            slug: config.metadata.slug,
            runtime: spec.runtime.language
        };
}

if (require.main === module) {
    const configPath = process.argv[2];

    if (!configPath) {
        console.error("Usage: node src/validate.js <project-config.yaml>");
        process.exit(2);
    }

    try {
        const result = validateProjectConfig(configPath);

        if (!result.valid) {
            console.error("Configuration validation failed:");

            for (const error of result.errors) {
                console.error(`- ${error.path || ""} ${error.message}`);
            }

            process.exit(1);
        }

        console.log("Configuration validation passed.");
        console.log(`Project: ${result.project}`);
        console.log(`Slug: ${result.slug}`);
        console.log(`Runtime: ${result.runtime}`);
    } catch (error) {
        console.error(`Validation error: ${error.message}`);
        process.exit(2);
    }
}

module.exports = { validateProjectConfig };