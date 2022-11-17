export const checkCSS = `
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Check CSS</title>
</head>

<body>
  <p>Hello World</p>
</body>

</html>
`;

export const checkAttributes = `
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Check Attributes</title>
</head>

<body class="my-class" id="my-id">
  <p>Hello World</p>
</body>

</html>
`;

export const checkChildren = `
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Check Children</title>
</head>

<body class="my-class" id="my-id">
  <div>
    <p>Hello World</p>
  </div>
</body>

</html>
`;

export const checkEmptyNodes = `
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Check Empty Nodes</title>
</head>

<body class="my-class" id="my-id">
  <div>

    <p>Hello World</p>

  </div>
</body>

</html>
`;

export const checkScriptAndNoScript = `
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Check Script and Noscript Tags</title>
</head>

<body class="my-class" id="my-id">
  <div>

    <p>Hello World</p>

  </div>
  <script>console.log('I will not be serialized!')</script>
  <noscript>console.log('I will not be serialized either!')</noscript>
</body>

</html>
`;
