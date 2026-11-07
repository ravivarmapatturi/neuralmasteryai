def eval_rpn(tokens):
    stack = []
    for tok in tokens:
        if tok in ("+", "-", "*", "/"):
            b, a = stack.pop(), stack.pop()  # b was pushed last: it is the right operand
            if tok == "+":
                stack.append(a + b)
            elif tok == "-":
                stack.append(a - b)
            elif tok == "*":
                stack.append(a * b)
            else:
                stack.append(int(a / b))  # truncate toward zero
        else:
            stack.append(int(tok))
    return stack[-1]
