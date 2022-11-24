export const jsonFixesFixtures = {
    simpleCaseCommas: {
        input: /* json */ `
        {
            "key": 123
            "key2": "prop",
        }
        `,
        expected: /* json */ `
        {
            "key": 123,
            "key2": "prop"
        }
        `,
    },
    extendedCase: {
        input: /* json */ `
        {
            "key" 123,
            key2: "prop"
        }
        `,
        expected: /* json */ `
        {
            "key": 123,
            "key2": "prop"
        }
        `,
    },
    // two last cases can be common when copying from JS
    doubleQuotesFix: {
        input: /* json */ `
        {
            some'Interesting'Key: "prop",
            \`some'Interesting'Key\`: "prop",
            \`someInterestingKey\`: "prop",
            'someInterestingKey': "prop"
        }
        `,
        expected: /* json */ `
        {
            "some'Interesting'Key": "prop",
            "some'Interesting'Key": "prop",
            "someInterestingKey": "prop",
            "someInterestingKey": "prop"
        }
        `,
    },
}
