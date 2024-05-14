//
// This is a function in the @squaredup/plugin-common package. This actually lives in another repo, but cannot
// easily be tested there (because it is the only ESM package in an otherwise CJS world!) After discussions
// with Josh, we concluded that the least painful way to allow unit testing functions in that package is to
// manually copy the source here (where everything is already ESM) to run the unit tests. This causes a
// maintenance burden; given the slow rate of change of the @squaredup/plugin-common package, this is less bad
// than trying to get the tests working in the other repo.
//

const sensitiveProps = ['auth', 'authorization', 'request', '_header'];
/**
 * This function returns a redacted, JSON-like string for the supplied object. This has been written because
 * a previous approach of redacting a promise's failure reason and calling the standard JSON.string() function
 * on it would mysteriously omit some useful properties (like "response") which contained valuable information
 * for debugging purposes.
 *
 * @param {*} object - the object to produce the redacted string for
 * @param { ?string[] } omitProperties - an array of additional properties to redact
 * @returns the redacted string
 */
export function getRedactedJsonString(object, omitProperties) {
    const seen = new Set();

    const propertiesToOmit = [...sensitiveProps, ...(omitProperties ?? [])];

    function getRedactedJsonStringInner(obj) {
        switch (typeof obj) {
            case 'object': {
                // Protect against circularities
                if (obj === null || seen.has(obj)) {
                    return 'null';
                }
                seen.add(obj);

                if (Array.isArray(obj)) {
                    return `[${obj.map((el) => getRedactedJsonStringInner(el)).join(',')}]`;
                } else {
                    const keys = Object.keys(obj);
                    const result = [];
                    for (const key of keys) {
                        const val = obj[key];
                        if (!propertiesToOmit.includes(key.toLowerCase())) {
                            const str = getRedactedJsonStringInner(val);
                            if (str) {
                                result.push(`"${key}":${str}`);
                            }
                        }
                    }
                    return `{${result.join(',')}}`;
                }
            }
            case 'function':
            case 'symbol':
            case 'undefined': {
                return undefined;
            }
            case 'string': {
                return `"${obj}"`;
            }
            default: {
                return obj.toString();
            }
        }
    }
    return getRedactedJsonStringInner(object);
}
