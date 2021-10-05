function OnUpdate(doc, meta) {
    if (meta.id === "allow_retrys") {
        // the timer is initialized by creating document with id = 'allow_retrys'
        CreateRetryTimer({"id": meta.id, "mode": "initial"});
    } else if (doc.fireRetry) {
      // process retry documents
      SendConfirmationMail(doc, meta.id);
    }
}

function CreateRetryTimer(context) {
    if (debug_level > 2) {
        log('From CreateRetryTimer: creating timer', context.mode, context.id);
    }
    // Create a timestamp 'retryTimerInterval' seconds (from the settings) from now
    var timerStartTime = new Date();
    // Get current time & add 'retryTimerInterval' sec. to it.
    timerStartTime.setSeconds(timerStartTime.getSeconds() + retryTimerInterval);
    // Create a document to use as out for our context
    createTimer(RetryTimerCallback, timerStartTime, context.id, context);
}

function RetryTimerCallback(context) {
    if (debug_level > 2) {
        log('From RetryTimerCallback: timer fired', context);
    }
    // rearm the timer ASAP, to ensure timer keeps running in the event
    // of later  errors or script timeouts in later "recurring work".
    CreateRetryTimer({ "id": context.id, "mode": "via_callback" });

    // Update all retry documents in the 'retry' bucket. Exclude the 'allow_retys' document
    // and any documents that were created more than 15 seonds ago, in order to avoid retry 'to early'.
    N1QL("UPDATE orders._default.retry SET fireRetry = true WHERE meta().id != 'allow_retrys' AND ts < DATE_ADD_MILLIS(NOW_MILLIS(), -15, 'second')");
}

function SendConfirmationMail(retryDoc, docId) {
  try {
      // resolve order document by id
      var doc = bkt_order_inbound[docId];
      // build the request
      var request = {
          path: 'sendConfirmation',
          body: doc
      };
      //  perform the cURL request using the URL alias from the settings
      var response = curl('POST', curlEmailServiceHost, request);
      if (response.status != 200) {
          // this did not work as expected
          if (debug_level > 1) {
              log("docId", docId, "cURL POST failed response.status:",response.status);
          }

        // increment attempt count in retry document
        retryDoc.attempt = ++retryDoc.attempt;
        // Set fireRetry = false, to avoid retry execution with this document change
        retryDoc.fireRetry = false;
        retryDoc.ts = Date.now();
        // update retry document
        bkt_order_retry[docId] = retryDoc;
      } else {
          if (debug_level > 5) {
              log("cURL POST success, sent",docId,"response.body:",response.body);
          }
          doc.confirmationEmailSent = true;
          bkt_order_inbound[docId] = doc;
          // delete the retry document
          delete bkt_order_retry[docId];
      }  } catch (e) {
      log("ERROR cURL request had an exception:",e)
  }
}
