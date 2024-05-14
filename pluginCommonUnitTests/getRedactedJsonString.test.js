import { describe, expect, it } from '@jest/globals';
import { getRedactedJsonString } from './getRedactedJsonString.js';

describe('getRedactedJsonString', () => {
    it('Handles bare strings', () => {
        const val = 'auth';
        const result = getRedactedJsonString(val);
        expect(result).toBe(`"${val}"`);
    });

    it('Handles bare numbers', () => {
        const val = Math.PI;
        const result = getRedactedJsonString(val);
        expect(result).toBe(val.toString());
    });

    it('Handles bare booleans', () => {
        const val = true;
        const result = getRedactedJsonString(val);
        expect(result).toBe(val.toString());
    });

    it('Handles simple objects', () => {
        const val = {
            stringProp: 'auth',
            numberProp: Math.PI,
            boolProp: true
        };
        const result = getRedactedJsonString(val);
        expect(result).toBe('{"stringProp":"auth","numberProp":3.141592653589793,"boolProp":true}');
    });

    it('Removes sensitive properties in simple objects', () => {
        const val = {
            stringProp: 'auth',
            auth: 'secret',
            numberProp: Math.PI,
            authorization: Math.PI,
            boolProp: true,
            request: false
        };
        const result = getRedactedJsonString(val);
        expect(result).toBe('{"stringProp":"auth","numberProp":3.141592653589793,"boolProp":true}');
    });

    it('Removes sensitive properties in nested objects', () => {
        const val = {
            top1: 'top1Val',
            nested1: {
                stringProp: 'auth',
                auth: 'secret'
            },
            top2: 'top2Val',
            nested2: {
                authorization: Math.PI,
                numberProp: Math.PI
            },
            top3: 'top3Val',
            nested3: {
                boolProp: true,
                request: false
            },
            top4: 'top4Val'
        };
        const result = getRedactedJsonString(val);
        expect(result).toBe(
            '{"top1":"top1Val","nested1":{"stringProp":"auth"},"top2":"top2Val","nested2":{"numberProp":3.141592653589793},"top3":"top3Val","nested3":{"boolProp":true},"top4":"top4Val"}'
        );
    });

    it('Removes sensitive properties in nested objects with circularities', () => {
        const val = {
            top1: 'top1Val',
            nested1: {
                stringProp: 'auth',
                auth: 'secret'
            },
            top2: 'top2Val',
            nested2: {
                authorization: Math.PI,
                numberProp: Math.PI
            },
            top3: 'top3Val',
            nested3: {
                boolProp: true,
                request: false,
                couldBeTrouble: null
            },
            top4: 'top4Val'
        };
        val.nested3.couldBeTrouble = val;
        const result = getRedactedJsonString(val);
        expect(result).toBe(
            '{"top1":"top1Val","nested1":{"stringProp":"auth"},"top2":"top2Val","nested2":{"numberProp":3.141592653589793},"top3":"top3Val","nested3":{"boolProp":true,"couldBeTrouble":null},"top4":"top4Val"}'
        );
    });

    it('Removes properties passed in by caller', () => {
        const val = {
            foo: 'bar',
            baz: 'quux'
        };

        const result = getRedactedJsonString(val, ['foo']);
        expect(result).toBe('{"baz":"quux"}');
    });
});
