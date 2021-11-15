// Define constants used for contracts / IO
const INPUT_CONFIG_DIR = 'config-dir';
const INPUT_FAIL_FAST = 'fail-fast';
const INPUT_GITHUB_TOKEN = 'github-token';

// Imports
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function run() {

    // Verify inputs for GitHub API interactions
    const githubToken = core.getInput(INPUT_GITHUB_TOKEN, { required: true });
    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    console.dir(context);

    // Verify inputs for action configuration
    const failFast = core.getBooleanInput(INPUT_FAIL_FAST);
    const configDir = core.getInput(INPUT_CONFIG_DIR, { required: true });
    const configPath = path.join(configDir, 'config.yml')

    fs.access(configPath, fs.constants.R_OK, async (err) => {

        if (err) {
            // TODO: Log information about what this error means
            throw err;
        }

        // Create supported resources For project(s) configured
        const config = yaml.load(fs.readFileSync(configPath));
        let success = true;

        for (const project of config.projects) {

            try {
                // Create project
                const { data: createForRepoResponse } = await octokit.rest.projects.createForRepo({
                    ...context.repo,
                    name: project.name,
                    body: project.body,
                });

                console.log(`Created project "${createForRepoResponse['name']}" (${createForRepoResponse['id']})"`);

                // Create project column(s)
                for (const column of project.columns) {
                    const { data: createColumnResponse } = await octokit.rest.projects.createColumn({
                        project_id: createForRepoResponse['id'],
                        name: column
                    })

                    console.log(`Created project column "${createColumnResponse['name']}" (${createColumnResponse['id']})" for project "${createForRepoResponse['name']}" (${createForRepoResponse['id']})`);
                }

                // Create project issues
                // TODO: Need templating integration
            } catch (err) {
                success = false;

                if (failFast) {
                    throw err;
                } else {
                    console.log(err);
                }
            }
        }

        if (!success) {
            throw new Error('One or more errors were caught while creating projects without fast-fail');
        }
    })
}

run();