export default async (request, context) => {
  const buckets = JSON.parse(Deno.env.get("AB_TEST_LIST") || "null");
  console.log(buckets);
  //If environment variable not set return standard page
  if (!buckets) {
    return context.next();
  }

  //Ensure weighting adds up to 1
  const totalWeighting = buckets.reduce(
    (tot: any, bucket: any) => tot + bucket.weighting,
    0
  );
  const weightingMultiplier = totalWeighting === 1 ? 1 : 1 / totalWeighting;

  //Set the cookie name of the bucket
  const cookieName = "netlify-split-test";

  const requestUrl = new URL(request.url);

  //Only required for next
  if (requestUrl.pathname.startsWith("/_next/images")) {
    return context.next();
  }

  // Get the bucket from the cookie
  let bucket = context.cookies.get(cookieName);
  let hasBucket = !!bucket;

  //Check cookie is active cookie
  if (bucket) {
    const isActiveCookie = buckets.find(b => b.url === bucket);
    console.log("Here", isActiveCookie);
    if (!isActiveCookie) {
      hasBucket = false;
    }
  }

  //Assign a bucket if the cookie has not been set
  if (!hasBucket) {
    const randomNumber = Math.random();
    let totalWeighting = 0;
    buckets.forEach((b: any) => {
      if (
        totalWeighting <= randomNumber &&
        randomNumber <= totalWeighting + b.weighting * weightingMultiplier
      ) {
        bucket = b.url;
        hasBucket = false;
      }
      totalWeighting += b.weighting * weightingMultiplier;
    });
  }

  //Generate full proxy url
  const url = `${bucket}${requestUrl.pathname}`;

  //Set cookie if new bucket has been set
  if (!hasBucket) {
    context.cookies.delete(bucketName);
    context.cookies.set({ name: bucketName, value: bucket });
  }

  const proxyResponse = await fetch(url);
  return new Response(proxyResponse.body, proxyResponse);
};
