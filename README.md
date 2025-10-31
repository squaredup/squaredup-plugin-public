# SquaredUp Community Plugins Repository

This repository contains third-party/community plugins for [SquaredUp](https://squaredup.com).

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Code of Conduct

Please read and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md) document before contributing to this repo in any way.

## Introduction

Plugins are vital components of SquaredUp. Each plugin bundles up everything involved in the interaction with a specific third party system, namely:

- The ability to import objects from an external system into SquaredUp.
- The ability to read data upon demand from an external system for displaying in dashboards and/or for use in the evaluation of monitors.

Plugins are installed into SquaredUp as part of the product build process. Once installed, they appear within the Data Source List in the product:

![DataSourceList](docs/images/DataSourceGallery.jpg)

## Execution Environments

A plugin may be executed within SquaredUp's SaaS environment or on a machine within a customer's premises (upon which the customer has installed a Relay Agent). If both environments are equally suitable for a plugin, it can
be declared as "hybrid" (in which case, two separate plugins will appear in the Data Source list, one with the label "On-Prem" added).

Javascript (NodeJS) is currently the implementation language/runtime with fullest capability, but PowerShell may be chosen for plugins which will only run On-Premise. We plan to support support other languages at some point in the future.

## Limitations

- plugin code for importing objects is limited to executing for no more than 10 minutes before being terminated; if more objects need to be imported than this time limit allows, a paging context object may be returned by the plugin to request that the plugin import code be recalled at a later date (with the same paging context object) to continue the import process. This can be repeated multiple times until all objects have been imported.
- plugin code for reading data upon demand for display in dashboards is limited to executing for no more than 6 seconds before being terminated.

## Structure of a plugin

A plugin is a directory in this repo of the form `plugins/`_plugin-name_`/v1` containing certain key files:

- `metadata.json` - a file containing high-level information about the plugin (for example: the execution location of the plugin, or the information that appears in the Data Source Gallery, above).
- `ui.json` - a file describing the configuration that must be shown to a user who is in the process of adding the plugin to their tenant to connect with an instance of the back end system.
- `custom_types.json` (Optional) - a file containing information about non-standard object types that will be imported by the plugin into the Data Mesh.
- `data_streams.json` - a file describing the streams of on demand data that SquaredUp can request of the plugin.
- `handler.js` and `package.json` the executable code of the plugin.

## Writing a Plugin

1. **Clone the Repository:**
    First, clone the repository to your local machine:

    ```bash
    git clone https://github.com/squaredup/squaredup-plugin-public.git
    cd squaredup-plugin-public
    ```

2. **Create a New Branch:**
    You will need to create a new branch for your changes:

    ```bash
    git checkout -b add-new-plugin # Replace Branch Name
    ```

3. **Creating the Plugin Folder:**
    The suggested way to write a new plugin is to make a copy of the `examplePlugins/hybrid/v1` directory in your `plugins/`_plugin-name_`/v1` directory.

   ```bash
   # Replace 'ExamplePlugin' with your plugin name
   mkdir -p 'plugins/ExamplePlugin/v1'
   cp -r 'examplePlugins/hybrid/v1/*' 'plugins/ExamplePlugin/v1/'
   ```

4. **Tailoring the Example Plugin:**
    You will need to tailor the configuration and code to interact with the specific back end as Required.
    This process is described in more detail in [Writing a New Plugin](docs/writingANewPlugin.md).
5. **Using `pnpm` to Install Dependencies:**
    `pnpm` is used for dependency management instead of `npm`. Check [pnpm](https://pnpm.io/pnpm-cli) to learn more about `pnpm`
    Ensure `pnpm` is installed by running `pnpm -version`. If its not installed it can be installed by running the following command:

    ```bash
    npm install --location=global pnpm@10
    ```

    If older version of `pnpm` is installed it can be upgraded by following `pnpm` update [documentation](https://pnpm.io/cli/self-update)

    | **Description**                 | **Command**                 | **Notes**                              |
    | ------------------------------- | --------------------------- | -------------------------------------- |
    | Install all packages                               | `pnpm i`     | e.g. after merging main                |
    | Install all packages without changing the lockfile | `pnpm fast`  | use `pnpm -w fast` if not in root      |
    | Install packages for certain package only | `pnpm -F "examplehybrid-v1" i` | `examplehybrid-v1` is from `package.json`'s name field |
    | Install packages for certain package without changing the lockfile | `pnpm -F "examplehybrid-v1" i --frozen-lockfile` | `examplehybrid-v1` is from `package.json`'s name field |
    | Add a package to Azure v1 | `pnpm add myPackage -F "azure-v1"` | `azure-v1` is from `package.json`'s name field |

6. **Testing the Plugin:** There are two main ways to test your plugin.
      1. Using the SquaredUp Test/Validation Script (`validate.js` in `scripts\plugins-validator`):

          ```bash
          pnpm run -w validate
          ```

      2. Using the SquaredUp Unit Test Framework which can be executed by running:

          ```bash
          # If running from the plugins directory
          pnpm run unitTest
          # If running from the root of the repo
          # Replace 'ExamplePlugin' with your plugin name
          pnpm run test --path="plugins/ExamplePlugin/v1"
          # OR
          # Replace example-plugin-v1 with name from package.json of the plugin you are interested in
          pnpm run -F "example-plugin-v1" unitTest
          ```

      You should aim to do as much testing as possible with the `validate.js` script as the turn-around time is much quicker.
      This process is described in more detail in [Testing a Plugin](docs/testingAPlugin.md).
7. **Installation**
    The plugin is only installed when a Pull Request has been submitted. During PR creation you will be
    asked for your Tenant (Organization) Name which can be retrieved from the [settings page](https://app.squaredup.com/settings/organization).
    This will be used for restricting the plugin to the specified tenant only.
    Once the PR is approved and merged, the plugin will be available for everyone.

## Contributing

We greatly appreciate your interest in contributing to this repository! To help you get started, please take a look at our detailed contribution guidelines in the [CONTRIBUTING](CONTRIBUTING.md) document.
