import { strict as assert } from 'node:assert';
import {
  applyUnsupportedParameterFallback,
  buildApiTimeoutMs,
  buildAnalysisRequestBody,
  buildAnalysisRequestOptions,
  buildSourceFrameEvidence,
  formatSourceImageFrameMetadata
} from '../src/shared/apiClient';

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

assert.deepEqual(buildAnalysisRequestOptions('gpt-4o'), {
  model: 'gpt-4o',
  temperature: 0.18,
  max_tokens: 12288,
  image_detail: 'high'
});

assert.equal(buildApiTimeoutMs(undefined), 600_000);
assert.equal(buildApiTimeoutMs(10), 60_000);
assert.equal(buildApiTimeoutMs(900), 900_000);
assert.equal(buildApiTimeoutMs(9_999), 1_800_000);

const gpt5Options = buildAnalysisRequestOptions('gpt-5.5');
assert.deepEqual(gpt5Options, {
  model: 'gpt-5.5',
  max_completion_tokens: 12288,
  reasoning_effort: 'medium',
  image_detail: 'high'
});
assert.equal(hasOwn(gpt5Options, 'max_tokens'), false);
assert.equal(hasOwn(gpt5Options, 'temperature'), false);

assert.deepEqual(buildAnalysisRequestOptions('openai/o4-mini'), {
  model: 'openai/o4-mini',
  max_completion_tokens: 12288,
  reasoning_effort: 'medium',
  image_detail: 'high'
});

assert.deepEqual(buildAnalysisRequestOptions('vision-reasoning'), {
  model: 'vision-reasoning',
  max_completion_tokens: 12288,
  reasoning_effort: 'medium',
  image_detail: 'high'
});

const fallbackOptions = buildAnalysisRequestOptions('gpt-4o');
assert.equal(
  applyUnsupportedParameterFallback(
    fallbackOptions,
    "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."
  ),
  true
);
assert.deepEqual(fallbackOptions, {
  model: 'gpt-4o',
  temperature: 0.18,
  image_detail: 'high',
  max_completion_tokens: 12288
});

assert.equal(
  applyUnsupportedParameterFallback(fallbackOptions, "Unsupported parameter: 'temperature' is not supported with this model."),
  true
);
assert.deepEqual(fallbackOptions, {
  model: 'gpt-4o',
  image_detail: 'high',
  max_completion_tokens: 12288
});
assert.equal(
  applyUnsupportedParameterFallback(fallbackOptions, "Unsupported parameter: 'temperature' is not supported with this model."),
  false
);

const reasoningFallbackOptions = buildAnalysisRequestOptions('o4-mini');
assert.equal(
  applyUnsupportedParameterFallback(
    reasoningFallbackOptions,
    "Unsupported parameter: 'reasoning_effort' is not supported with this model."
  ),
  true
);
assert.deepEqual(reasoningFallbackOptions, {
  model: 'o4-mini',
  image_detail: 'high',
  max_completion_tokens: 12288
});

assert.equal(
  applyUnsupportedParameterFallback(reasoningFallbackOptions, "Unsupported parameter: 'image_url.detail' is not supported with this model."),
  true
);
assert.deepEqual(reasoningFallbackOptions, {
  model: 'o4-mini',
  max_completion_tokens: 12288
});

const portraitFrame = buildSourceFrameEvidence({ width: 390, height: 520 });
assert.deepEqual(portraitFrame, { width: 390, height: 520, orientation: 'portrait', aspectRatio: '3:4' });
const portraitFrameMetadata = formatSourceImageFrameMetadata(portraitFrame);
assert.match(portraitFrameMetadata, /390 px wide x 520 px tall/);
assert.match(portraitFrameMetadata, /Observed orientation: portrait/);
assert.match(portraitFrameMetadata, /approximately 3:4/);
assert.match(portraitFrameMetadata, /hard source-frame evidence/);
assert.match(portraitFrameMetadata, /Do not call the image horizontal/);

const analysisRequestBody = JSON.parse(
  buildAnalysisRequestBody(buildAnalysisRequestOptions('gpt-4o'), 'Analyze this image.', 'image/png', 'AAA=', portraitFrameMetadata)
);
assert.match(analysisRequestBody.messages[0].content[0].text, /Analyze this image\./);
assert.match(analysisRequestBody.messages[0].content[0].text, /Source image frame metadata:/);
assert.match(analysisRequestBody.messages[0].content[0].text, /Observed orientation: portrait/);
assert.equal(analysisRequestBody.messages[0].content[1].image_url.url, 'data:image/png;base64,AAA=');

const landscapeFrameMetadata = formatSourceImageFrameMetadata(buildSourceFrameEvidence({ width: 1717, height: 916 }));
assert.match(landscapeFrameMetadata, /Observed orientation: landscape/);
assert.match(landscapeFrameMetadata, /approximately 1.87:1/);

console.log('api option checks passed');
