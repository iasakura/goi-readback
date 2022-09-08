{{
  import {Term} from '../../types/lambda';
}}

Lam
  = "\\" params:(_ v:Var)+ _ "->" _ body:Lam {
      return params.reverse().reduce((acc: Term, x: [string, string]) => {
        return { type: 'lam', var: x[1], body: acc } as Term
      }, body)
    } /
    app:App {
      return app as Term;
    }

App
  = f:Prim args:(_ x:Prim)+ {
      return args.reduce((acc: Term, x: [string, Term]) => {
        return { type: 'app', term1: acc, term2: x[1] } as Term
      }, f);
  } / p:Prim {
      return p;
  }

Prim
   = v:Var {
       return {type: 'var', var: v } as Term
   } / "(" _ e:Lam _ ")" {
       return e as Term;
   }

Var
    = h:[a-zA-Z] t:[a-zA-Z0-9]* {
        return [h, ...t].join('');
}

_ "whitespace"
  = [ \t\n\r]*
