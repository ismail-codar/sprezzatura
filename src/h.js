module.exports = function (tagName, attributes, childs) {
    return [tagName, attributes || {}, childs || []];
};