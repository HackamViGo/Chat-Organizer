# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e6]
      - heading "Welcome Back" [level=1] [ref=e9]
      - paragraph [ref=e10]: Sign in to your account
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Email
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "you@example.com" [ref=e18]
      - generic [ref=e19]:
        - generic [ref=e20]: Password
        - generic [ref=e21]:
          - img [ref=e22]
          - textbox "••••••••" [ref=e25]
          - button [ref=e26]:
            - img [ref=e27]
      - generic [ref=e30]:
        - checkbox "Remember me" [ref=e31] [cursor=pointer]
        - generic [ref=e32] [cursor=pointer]: Remember me
      - button "Sign In" [ref=e33]
    - generic [ref=e38]: Or continue with
    - button "Sign in with Google" [ref=e39]:
      - img [ref=e40]
      - text: Sign in with Google
    - paragraph [ref=e45]:
      - text: Don't have an account?
      - link "Sign up" [ref=e46] [cursor=pointer]:
        - /url: /auth/signup
  - alert [ref=e47]
```