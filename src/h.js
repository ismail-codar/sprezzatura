module.exports = function (tagName, attributes, childs) {
    if (attributes instanceof Array) {
        childs = attributes;
        attributes = {};
    } else if (typeof (attributes) == "string") {
        childs = [attributes];
        attributes = {};
    }
    return [tagName, attributes || {}, childs || []];
};