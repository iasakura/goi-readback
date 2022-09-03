import { parseTerm } from ".";

test("\\ x y z -> x y z should be parsed", () => {
  const res = parseTerm("\\ x y z -> x y z");
  expect(res).toEqual({
    type: "lam",
    var: "x",
    body: {
      type: "lam",
      var: "y",
      body: {
        type: "lam",
        var: "z",
        body: {
          type: "app",
          term1: {
            type: "app",
            term1: {
              type: "var",
              var: "x",
            },
            term2: {
              type: "var",
              var: "y",
            },
          },
          term2: {
            type: "var",
            var: "z",
          },
        },
      },
    },
  });
});
