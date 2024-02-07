# Writing a new Plugin

  - [Importing Objects](#importing-objects)
  - [`custom_types.json`](#custom_typesjson)
  - [`handlerConfig.js (importObjects)`](#handlerconfigjs-importobjects)
  - [`importObjects/` Directory](#import-Directory)

## Importing Objects

Importing objects (or Indexing as named in the Observability Portal UI) for a plugin is a process that usually occurs once every twelve hours and creates representations in the Data Mesh of the important objects and relationships in the end-user's instance of the external monitoring system.

When choosing objects to be imported by a plugin, it's important to consider the importance to the end user and the rate of change of those objects. For example, for objects which come and go several times an hour, importing the state once every twelve hours would result in a very out-of-date representation in the Observability Portal.

For example, for a fictional devops system, a plugin might import job configurations with any associated folder structure, but not job runs. (These would be obtained on demand via data streams - see later).

**It is important to consider that the run-time in which object import process for a plugin runs is limited to 10 minutes elapsed time. Additionally, there are payload size limits to consider.**

**For this reason, there is a loop in the example plugin's `handler.js` file which will loop until either limit is close to being reached, repeatedly calling import "stage" functions which must be supplied by the plugin author. This stage function should make a very small number of requests upon the external system (ideally only a single call) and return promptly to the main loop having incorporated the data returned into the resulting `vertices` and `edges` arrays. The stage function returns a boolean value indicating whether it has completed its work or not. In order that the stage function can know where to resume operation if it is recalled after a previous call returns `false`, it can record whatever data it needs (e.g. "next URL" values or continuation "token" values etc.) inside a variable provided for this purpose: `context.pagingContext`.**

### `custom_types.json`

Objects returned by a plugins import process must each be assigned a type. A plugin author should try to use standard types whenever possible (as this will increase opportunities for the correlation feature to form links between objects imported by different plugins. Correlation like this is what makes the Data Mesh concept so powerful). If none of the standard types is suitable for objects imported by a new plugin, the plugin author may register a new type by entering an entry in the initially empty array in `custom_types.json` like:
```json
    {
        "name": "Human-readable Fl Type Name",
        "type": "mytypevalue",
        "icon": "font-awesome-icon-name",
        "singular": "Singular Form of Short Typename",
        "plural": "Plural Form of Short Typename"
    }
```

When creating a vertex using a custom type, set the vertex's `type` field to the value of the `type` field for the custom type in `custom_types.json`.

(Note that the value of the `name` property is not currently use in the product UI, but it's still worth filling it in with something meaningful.)

The standard types available are:

<ul>
<table>
<tr><th></th><th><tt>type</tt></th><th>singular</th><th>plural</th></tr>
<tr><td><img src="images/svg/browser.svg" width=32 height=32></td><td>app</td><td>App</td><td>Apps</td></tr>
<tr><td><img src="images/svg/network-wired.svg" width=32 height=32></td><td>api</td><td>API</td><td>APIs</td></tr>
<tr><td><img src="images/svg/globe.svg" width=32 height=32></td><td>apidomain</td><td>API Domain</td><td>API Domains</td></tr>
<tr><td><img src="images/svg/network-wired.svg" width=32 height=32></td><td>apigateway</td><td>API Gateway</td><td>API Gateways</td></tr>
<tr><td><img src="images/svg/map.svg" width=32 height=32></td><td>dnszone</td><td>DNS Zone</td><td>DNS Zones</td></tr>
<tr><td><img src="images/svg/signs-post.svg" width=32 height=32></td><td>dnsrecord</td><td>DNS Record</td><td>DNS Records</td></tr>
<tr><td><img src="images/svg/database.svg" width=32 height=32></td><td>db</td><td>Database</td><td>Databases</td></tr>
<tr><td><img src="images/svg/server.svg" width=32 height=32></td><td>host</td><td>Host</td><td>Hosts</td></tr>
<tr><td><img src="images/svg/monitor-waveform.svg" width=32 height=32></td><td>monitor</td><td>Monitor</td><td>Monitors</td></tr>
<tr><td><img src="images/svg/gauge-high.svg" width=32 height=32></td><td>kpi</td><td>KPI</td><td>KPIs</td></tr>
<tr><td><img src="images/svg/lambda.svg" width=32 height=32></td><td>function</td><td>Function</td><td>Functions</td></tr>
<tr><td><img src="images/svg/table.svg" width=32 height=32></td><td>table</td><td>Table</td><td>Tables</td></tr>
<tr><td><img src="images/svg/cloud.svg" width=32 height=32></td><td>storage</td><td>Storage</td><td>Storage</td></tr>
<tr><td><img src="images/svg/cloud.svg" width=32 height=32></td><td>cdn</td><td>CDN</td><td>CDNs</td></tr>
<tr><td><img src="images/svg/address-book.svg" width=32 height=32></td><td>directory</td><td>Directory</td><td>Directories</td></tr>
<tr><td><img src="images/svg/bring-front.svg" width=32 height=32></td><td>relay</td><td>Relay</td><td>Relays</td></tr>
<tr><td><img src="images/svg/tag.svg" width=32 height=32></td><td>tag</td><td>Tag</td><td>Tags</td></tr>
<tr><td><img src="images/svg/layer-group.svg" width=32 height=32></td><td>space</td><td>Workspace</td><td>Workspaces</td></tr>
<tr><td><img src="images/svg/bullseye.svg" width=32 height=32></td><td>scope</td><td>Scope</td><td>Scopes</td></tr>
<tr><td><img src="images/svg/browser.svg" width=32 height=32></td><td>dash</td><td>Dashboard</td><td>Dashboards</td></tr>
<tr><td><img src="images/svg/cubes.svg" width=32 height=32></td><td>cluster</td><td>Cluster</td><td>Clusters</td></tr>
<tr><td><img src="images/svg/cog.svg" width=32 height=32></td><td>service</td><td>Service</td><td>Services</td></tr>
<tr><td><img src="images/svg/scale-balanced.svg" width=32 height=32></td><td>loadbalancer</td><td>Load Balancer</td><td>Load Balancers</td></tr>
<tr><td><img src="images/svg/suitcase.svg" width=32 height=32></td><td>container</td><td>Container</td><td>Containers</td></tr>
<tr><td><img src="images/svg/angles-right.svg" width=32 height=32></td><td>workflow</td><td>Workflow</td><td>Workflows</td></tr>
<tr><td><img src="images/svg/screwdriver.svg" width=32 height=32></td><td>pipeline</td><td>Pipeline</td><td>Pipelines</td></tr>
<tr><td><img src="images/svg/building.svg" width=32 height=32></td><td>organization</td><td>Organization</td><td>Organizations</td></tr>
<tr><td><img src="images/svg/project-diagram.svg" width=32 height=32></td><td>project</td><td>Project</td><td>Projects</td></tr>
<tr><td><img src="images/svg/code-branch.svg" width=32 height=32></td><td>repository</td><td>Repository</td><td>Repositories</td></tr>
<tr><td><img src="images/svg/cloud.svg" width=32 height=32></td><td>environment</td><td>Environment</td><td>Environments</td></tr>
<tr><td><img src="images/svg/rocket.svg" width=32 height=32></td><td>release</td><td>Release</td><td>Releases</td></tr>
<tr><td><img src="images/svg/file-invoice.svg" width=32 height=32></td><td>account</td><td>Account</td><td>Accounts</td></tr>
<tr><td><img src="images/svg/user.svg" width=32 height=32></td><td>user</td><td>User</td><td>Users</td></tr>
<tr><td><img src="images/svg/users.svg" width=32 height=32></td><td>group</td><td>Group</td><td>Groups</td></tr></table>
</ul>

### `handlerConfig.js` (**importObjects**)

In `handlerConfig.js`, you should add a JavaScript `import` statement for each import stage function at the top of the file. You should add a reference to each function in the `importStages` array - during each import operation, the stage functions will be run in the order in which their references appear in this array.

You should add an entry to the `defaultApiLimits` object for each object type being imported to indicate the default page size you should request when calling the back-end (the code in your import stage function should clearly honour this value when making back-end calls). Doing this will enable you to override the page size for any individual object type at run-time for testing/debugging purposes using the `testSettings` object (described later).

Finally, you should supply initial values for add any stage specific properties to the `initialPagingContext` object. These will help each import stage function to behave correctly the first time they are called for any run of the object import process.

### `importObjects/` Directory

For each object type you import, you should create an import stage function in its own source file in the `importObjects/` directory. This function will be called (repeatedly) during an import until it returns `true` (at which point the next import function in the `importStages` array is called until the last stage function returns `true` whereupon import is complete).

The function is passed a single parameter, `context`, which holds properties containing everything the function needs to know about the import in progress:

- `vertices` - an array into which the import stage can push vertices to be added to the Data Mesh.
- `edges` - an array into which the import stage can push edges to be added to the Data Mesh.
- `pluginConfig` - an object containing the configuration choices the end-user made when adding this instance of the plugin to their tenant.
- `apiLimits` - an object initialized from `defaultApiLimits` in `handlerConfig.js` (but possibly overwritten by `testSettings`). The import function should take care to request pages of this size from the external system.
- `pagingContext` - an object containing information about how far through the import process this plugin has got.
- `log` - see: [Standard SquaredUp `api` Functions](./writingANewPlugin.md#standard-squaredup-api-functions)
- `report` - see: [Standard SquaredUp `api` Functions](./writingANewPlugin.md#standard-squaredup-api-functions)
- `patchConfig` - see: [Standard SquaredUp `api` Functions](./writingANewPlugin.md#standard-squaredup-api-functions)

The code in the import function should make an HTTP request, using the client package of choice (`node-fetch` has been part of the NodeJS core since v18 and therefore is a good choice) for the first/next page of object (as determined by the contents of `context.pluginConfig`, `context.pagingContext` and `pagingContext.apiLimits`). For each object returned in the response payload, a new vertex should be pushed into `context.vertices`, edges between vertices may optionally be pushed into `context.edges` and `context.pagingContext` should be updated so that the next call on this function, if any, knows where to continue (e.g. store a next token value in `context.pagingContext.nextServerToken`). If all objects have been imported for this stage, the function should return `true` when complete.

#### Vertex Objects
When creating vertex objects, some properties are mandatory as follows (all of type `string`):

- `sourceName` - a readable identifier of the plug-in that imported the vertex
- `type` - a lowercase string identifying the overarching type of the vertex (this will determine the grouping and icon used when the vertex is viewed in the UI). See the list in [`custom_types.json`](#custom_typesjson). For example: “host”.
- `sourceType` - a more specific type, name of relevance to the plug-in (e.g. for scoping purposes). For example: “myservicehost“.
- `sourceId` - a unique id of this vertex within this instance of the plug-in.
- `name` - the name of the vertex to be displayed in the UI.

...other properties may be added as needed. Remember that the refresh rate of imported objects is slow, so do not include properties that change frequently here (use data on demand for those - see later).

#### Edge Objects
Edge objects will create an edge in the Data Mesh between two of your plugin's imported objects identified by their sourceId values, they have three mandatory properties (all of type `string`):

- `label` - a readable label for the edge (this will be shown in graph views in the UI).
- `inV` - the `sourceId` of the vertex _in to which_ the edge goes
- `outV` - the `sourceId` of the vertex _from which_ the edge emanates

**It is most important that an import stage function _not_ loop consuming all pages of data for their object type. This could result in the plugin run-time being terminated (for exceeding 10 minutes elapsed time) or result in a payload size that will cause an exception to be thrown when the import completes. Always store information about any next page of data in `context.pagingContext` and return `false` to be sure of fetching subsequent pages of data successfully**
