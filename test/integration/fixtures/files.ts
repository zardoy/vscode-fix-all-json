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
}
