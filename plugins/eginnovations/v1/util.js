export function getScalar(obj, propertyName) {
    if (Array.isArray(obj[propertyName])) {
        return obj[propertyName][0];
    }
    return obj[propertyName];
}