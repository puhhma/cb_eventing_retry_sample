// OnUpdate is invoked for all documents created/updated in the 'inbound' bucket
function OnUpdate(doc, meta) {
    // determine if document status is 'paid' & confirmation email was not previously sent
    if( doc.paymentStatus === "paid" && !doc.confirmationEmailSent ) {
        SendConfirmationMail(doc, meta.id);
    } else {
      if (debug_level > 1)
        log("Nothing to do for: " + meta.id);
    }
}

function SendConfirmationMail(doc, docId) {
  try {
      // build the request to the EmailService
      var request = {
          path: 'sendConfirmation',
          body: doc
      };
      //  perform the cURL request using the URL alias 'curlEmailServiceHost' from the settings
      var response = curl('POST', curlEmailServiceHost, request);
      if (response.status != 200) {
          // this did not work as expected
          if (debug_level > 1) {
              log("docId", docId, "cURL POST failed response.status:",response.status);
          }
          // create retry document referencing the documentId and store in 'retry' bucket
          bkt_order_retry[docId] = {
              "docId": docId,
              "attempt": 1,
              "ts": Date.now()
          }
      } else {
          if (debug_level > 5) {
              log("cURL POST success, sent",docId,"response.body:",response.body);
          }
          // update confirmationEmailSent status
          doc.confirmationEmailSent = true;
          bkt_order_inbound[docId] = doc;
      }
  } catch (e) {
      log("ERROR cURL request had an exception:",e)
  }
}
