'use client';

export default function TestClippingMagicSimple() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ClippingMagic Simple Test</h1>

      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="font-semibold text-yellow-800 mb-2">
          Testing ClippingMagic Integration
        </p>
        <p className="text-sm text-yellow-700 mb-4">
          This page tests the ClippingMagic white label editor with hardcoded
          values from their example.
        </p>
      </div>

      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="font-semibold text-blue-800 mb-2">What this test does:</p>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Loads the ClippingMagic.js script</li>
          <li>Initializes with your API ID (24469)</li>
          <li>Attempts to open the editor with a test image</li>
          <li>Uses the exact code from ClippingMagic's documentation</li>
        </ol>
      </div>

      <div className="p-4 bg-gray-100 rounded">
        <p className="text-sm font-semibold mb-2">
          View the page source to see the implementation
        </p>
        <p className="text-xs text-gray-600">
          The ClippingMagic code is embedded directly in the HTML
        </p>
      </div>

      <script
        src="https://clippingmagic.com/api/v1/ClippingMagic.js"
        type="text/javascript"
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          function myCallback(opts) {
            console.log('ClippingMagic callback:', opts);
            switch (opts.event) {
              case "error":
                  alert("An error occurred: " + opts.error.status + ", " + opts.error.code + ", " + opts.error.message);
                  break;

              case "result-generated":
                  alert("Generated a result for " + opts.image.id + ", " + opts.image.secret);
                  console.log("Result generated:", opts);
                  break;

              case "editor-exit":
                  alert("The editor dialog closed");
                  break;
            }
          }
          
          // Wait for ClippingMagic to load
          window.addEventListener('load', function() {
            if (typeof window.ClippingMagic !== 'undefined') {
              var errorsArray = window.ClippingMagic.initialize({apiId: 24469});
              
              if (errorsArray.length > 0) {
                alert("Sorry, your browser is missing some required features: \\n\\n " + errorsArray.join("\\n "));
              } else {
                console.log('ClippingMagic initialized successfully');
                
                // Try to open editor immediately with your uploaded image
                setTimeout(function() {
                  console.log('Attempting to open editor...');
                  try {
                    window.ClippingMagic.edit({
                      "image": {
                        "id": 207794051,
                        "secret": "g5rssaot702277tqfdpufdmqjtkc2u8j9h9t7fhro879csnbmtv"
                      },
                      "useStickySettings": true,
                      "hideBottomToolbar": false,
                      "locale": "en-US"
                    }, myCallback);
                  } catch (e) {
                    console.error('Failed to open editor:', e);
                    alert('Failed to open editor: ' + e.message);
                  }
                }, 2000);
              }
            } else {
              alert('ClippingMagic script failed to load');
            }
          });
        `,
        }}
      />
    </div>
  );
}
