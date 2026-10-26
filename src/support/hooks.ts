import { Before, After, setDefaultTimeout, Status } from '@cucumber/cucumber';
import type { AcceptanceWorld } from './world';

setDefaultTimeout(7000);

Before(async function (this: AcceptanceWorld) {
  await this.stub.start(this.settings.stubPort);
  this.stubStarted = true;
});

After(async function (this: AcceptanceWorld, { result, pickle }) {
  try {
    if (result?.status === Status.PASSED) this.stub.verify();
  } finally {
    try {
      if (result?.status !== Status.PASSED) {
        this.attach(
          JSON.stringify(
            {
              scenario: pickle.name,
              response: this.response && {
                status: this.response.status,
                headers: this.response.headers,
                rawBody: this.response.rawBody.slice(0, 3000),
              },
              providerJournal: this.stub.diagnostics(),
            },
            null,
            2,
          ),
          'application/json',
        );
      } else {
        this.attach(this.stub.diagnostics(), 'application/json');
      }
    } finally {
      if (this.stubStarted) await this.stub.close();
    }
  }
});
