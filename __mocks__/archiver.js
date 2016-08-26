module.exports = {
    create: jest.fn(function() {
        return {
            pipe: jest.fn(function() {}),
            directory: jest.fn(function() {}),
            finalize: jest.fn(function() {})
        }
    })
};