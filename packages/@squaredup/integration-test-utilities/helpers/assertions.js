import { expect } from 'vitest';

export const verifyMetricAverageMetadata = (data) => {
    expect(data).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                resource: expect.any(String),
                id: expect.any(String),
                unit: expect.any(String),
                timeseries: expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.arrayContaining([
                            expect.objectContaining({
                                average: expect.any(Number),
                                timeStamp: expect.any(String)
                            })
                        ])
                    })
                ])
            })
        ])
    );
};

export const verifyMetricTotalMetadata = (data) => {
    expect(data).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                resource: expect.any(String),
                id: expect.any(String),
                unit: expect.any(String),
                timeseries: expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.arrayContaining([
                            expect.objectContaining({
                                total: expect.any(Number),
                                timeStamp: expect.any(String)
                            })
                        ])
                    })
                ])
            })
        ])
    );
};

export const verifyDataStreamResponse = (received, expected) => {
    expect(received).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
};

export const verifyResultMessages = (receivedMessages, expectedMessages = [], receivedMessageLength) => {
    if (receivedMessageLength) {
        expect(
            receivedMessages.length,
            `Expected Length to equal ${receivedMessageLength} or ${expectedMessages.length} but got ${receivedMessages.length}`
        ).toEqual(receivedMessageLength || expectedMessages.length);
    }

    expect(receivedMessages).toEqual(expect.arrayContaining(expectedMessages));
};
